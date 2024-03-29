
/*!
 * xStats.js v1.0.0-pre
 * Copyright 2011-2012 John-David Dalton <http://allyoucanleet.com/>
 * Based on Stats.js, copyright Ricardo Cabello <http://mrdoob.com/>
 * Available under MIT license <https://github.com/jdalton/xstats.js/raw/master/LICENSE.txt>
 */
;(function(window, document) {
  'use strict';

  /** Detect memory object */
  var memoryNS = (memoryNS = window.performance || window.webkitPerformance || window.console) &&
    memoryNS.memory && memoryNS;

  /** Shortcut used to convert array-like objects to arrays */
  var slice = [].slice;

  /** Internal cached used by various methods */
  var cache = {
    'counter': 1,
    'frameTimes': [],
    'lastSecond': null,
    'lastTime': null,
    'data': { 'fps': new Data, 'ms': new Data, 'mem': new Data }
  };

  /** Math shortcuts */
  var floor = Math.floor,
      max   = Math.max,
      min   = Math.min,
      round = Math.round;

  /*--------------------------------------------------------------------------*/

  /**
   * The Data object constructor.
   *
   * @private
   * @constructor
   */
  function Data() {
    // add own properties to avoid lookups on the Array.prototype
    return extend([], { 'max': null, 'min': null });
  }

  /**
   * The Event constructor.
   *
   * @constructor
   * @memberOf xStats
   * @param {String|Object} type The event type.
   */
  function Event(type) {
    var me = this;
    return (!me || me.constructor != Event)
      ? new Event(type)
      : (type instanceof Event)
          ? type
          : extend(me, typeof type == 'string' ? { 'type': type } : type);
  }

  /**
   * The xStats constructor.
   *
   * @constructor
   * @param {Object} [options={}] Options object.
   * @example
   *
   * // basic usage (the `new` operator is optional)
   * var stats = new xStats;
   *
   * // or using options
   * var stats = new xStats({
   *   'mode': 'ms',
   *   'height': 130,
   *   'width':200,
   *   'padding':10,
   *   'locked': false,
   *   'fps': {
   *     'bg': '#330000',
   *     'fg': '#cc6600'
   *   },
   *   'ms': {
   *     'bg': '#000033',
   *     'fg': '#3366ff'
   *   },
   *   'mem': {
   *     'bg': '#000033',
   *     'fg': '#660099'
   *   }
   * });
   *
   * // insert into document
   * document.body.appendChild(stats.element);
   */
  function xStats(options) {
    var clipped,
        element,
        fps,
        height,
        mem,
        ms,
        padding,
        uid,
        width,
        data = cache.data,
        me = this,
        tmp = {};

    // allow instance creation without the `new` operator
    if (!me || me.constructor != xStats) {
      return new xStats(options);
    }

    element = document.createElement('div');
    uid = 'xstats' + cache.counter++;

    // apply options
    extend(me, options || (options = {}));
    me.uid = uid;
    extend(tmp, me);

    fps = me.fps = extend(extend({}, me.fps), options.fps);
    ms = me.ms = extend(extend({}, me.ms), options.ms);
    mem = me.mem = extend(extend({}, me.mem), options.mem);

    // compute dimensions
    padding = me.padding * 2;
    height = me.height - padding;
    width = me.width - padding;
    clipped = max(1, round(width * 0.02));
    width = floor(width / clipped);

    // sweet spot for font-size, height, and width
    tmp.titleHeight = round(height * 0.28);
    tmp.barWidth = clipped + 4;
    tmp.fontSize = (tmp.titleHeight / 22.2).toFixed(2);
    tmp.innerWidth = clipped * width;
    tmp.innerHeight = height - tmp.titleHeight;
    tmp.padding = round((me.width - tmp.innerWidth) / 2);

    // increase shared data if needed
    if (data.ms.length < width) {
      data.fps.length =
      data.ms.length =
      data.mem.length = width;
    }
    // append customized css
    appendCSS(
      interpolate(
        '.#{uid},.#{uid} .bg,.#{uid} .fg{width:#{width}px;height:#{height}px}' +
        '.#{uid} .mi{margin:#{padding}px;width:#{innerWidth}px}' +
        '.#{uid} p{font-size:#{fontSize}em;height:#{titleHeight}px;width:#{innerWidth}px}' +
        '.#{uid} ul{height:#{innerHeight}px;width:#{innerWidth}px}' +
        '.#{uid} li{width:#{barWidth}px}', tmp) +
      interpolate(
        '.#{uid}.fps{color:#{fg}}' +
        '.#{uid}.fps ul{background:#{fg}}' +
        '.#{uid}.fps .bg,.#{uid}.fps li{background:#{bg}}', extend(tmp, fps)) +
      interpolate(
        '.#{uid}.ms{color:#{fg}}' +
        '.#{uid}.ms ul{background:#{fg}}' +
        '.#{uid}.ms .bg,.#{uid}.ms li{background:#{bg}}', extend(tmp, ms)) +
      interpolate(
        '.#{uid}.mem{color:#{fg}}' +
        '.#{uid}.mem ul{background:#{fg}}' +
        '.#{uid}.mem .bg,.#{uid}.mem li{background:#{bg}}', extend(tmp, mem)));

    // build interface
    element.className = 'xstats ' + uid + ' ' + me.mode;
    element.innerHTML = '<div class=bg></div><div class=mi><p>&nbsp;</p><ul>' + repeat('<li></li>', width) + '</ul></div><div class=fg></div>';

    // add element event listeners
    if (typeof element.addEventListener != 'undefined') {
      element.addEventListener('click', createSwapMode(me), false);
    } else if (element.attachEvent != 'undefined') {
      element.attachEvent('onclick', createSwapMode(me));
    }

    // grab elements
    me.element = element;
    me.canvas = element.getElementsByTagName('ul')[0];
    me.title = element.getElementsByTagName('p')[0].firstChild;

    // keep track of instances to animate
    xStats.subclasses.push(me);
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Adds a css class name to an element's className property.
   *
   * @private
   * @param {Object} element The element.
   * @param {String} className The class name.
   */
  function addClass(element, className) {
    element.className += (element.className ? ' ' : '') + className;
  }

  /**
   * Appends CSS text to a planted style sheet.
   *
   * @private
   * @param {String} cssText The CSS text.
   */
  function appendCSS(cssText) {
    var node,
        prop = 'cssText',
        sheet = cache.sheet;

    if (!sheet) {
      node = document.getElementsByTagName('head')[0];
      sheet = cache.sheet = document.createElement('style');
      sheet.type = 'text/css';
      node.insertBefore(sheet, node.firstChild);
    }
    if (!(node = 'styleSheet' in sheet && sheet.styleSheet)) {
      prop = 'nodeValue';
      node = sheet.firstChild || sheet.appendChild(document.createTextNode(''));
    }
    node[prop] += cssText;
  }

  /**
   * An iteration utility for arrays.
   * Callbacks may terminate the loop by explicitly returning `false`.
   *
   * @private
   * @param {Array} array The array to iterate over.
   * @param {Function} callback The function called per iteration.
   * @returns {Array} Returns the array iterated over.
   */
  function each(array, callback) {
    var index = -1,
        length = array.length;

    while (++index < length) {
      if (callback(array[index], index, array) === false) {
        break;
      }
    }
    return array;
  }

  /**
   * Copies enumerable properties from the source object to the destination object.
   *
   * @private
   * @param {Object} destination The destination object.
   * @param {Object} [source={}] The source object.
   * @returns {Object} The destination object.
   */
  function extend(destination, source) {
    source || (source = {});
    for (var key in source) {
      destination[key] = source[key];
    }
    return destination;
  }

  /**
   * Modify a string by replacing named tokens with matching object property values.
   *
   * @private
   * @param {String} string The string to modify.
   * @param {Object} object The template object.
   * @returns {String} The modified string.
   */
  function interpolate(string, object) {
    for (var key in object) {
      string = string.replace(RegExp('#\\{' + key + '\\}', 'g'), object[key]);
    }
    return string;
  }

  /**
   * Removes a css class name from an element's className property.
   *
   * @private
   * @param {Object} element The element.
   * @param {String} className The class name.
   */
  function removeClass(element, className) {
    var cn,
        classNames = element.className.split(' '),
        filtered = [];

    while ((cn = classNames.pop())) {
      if (className != cn) {
        filtered.push(cn);
      }
    }
    element.className = filtered.join(' ');
  }

  /**
   * Repeat a string a given number of times using the `Exponentiation by squaring` algorithm.
   *
   * @private
   * @param {String} string The string to repeat.
   * @param {Number} count The number of times to repeat the string.
   * @returns {String} The repeated string.
   * @see http://www.merlyn.demon.co.uk/js-misc0.htm#MLS
   */
  function repeat(string, count) {
    if (count < 1) return '';
    if (count % 2) return repeat(string, count - 1) + string;
    var half = repeat(string, count / 2);
    return half + half;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Registers a single listener for the specified event type(s).
   *
   * @memberOf xStats
   * @param {String} type The event type.
   * @param {Function} listener The function called when the event occurs.
   * @returns {Object} The xStats instance.
   * @example
   *
   * // register a listener for an event type
   * xs.addListener('sample', listener);
   *
   * // register a listener for multiple event types
   * xs.addListener('start sample', listener);
   */
  function addListener(type, listener) {
    var me = this,
        events = me.events || (me.events = {});

    each(type.split(' '), function(type) {
      (events[type] || (events[type] = [])).push(listener);
    });
    return me;
  }

  /**
   * Executes all registered listeners of the specified event type.
   *
   * @memberOf xStats
   * @param {String|Object} type The event type or object.
   * @returns {Boolean} Returns `true` if all listeners were executed, else `false`.
   */
  function emit(type) {
    var me = this,
        event = Event(type),
        args = (arguments[0] = event, slice.call(arguments)),
        events = me.events,
        listeners = events && events[event.type] || [],
        result = true;

    each(listeners.slice(), function(listener) {
      if (!(result = listener.apply(me, args) !== false)) {
        return result;
      }
    });
    return result;
  }

  /**
   * Unregisters a single listener for the specified event type(s).
   *
   * @memberOf xStats
   * @param {String} type The event type.
   * @param {Function} listener The function to unregister.
   * @returns {Object} The xStats instance.
   * @example
   *
   * // unregister a listener for an event type
   * xs.removeListener('sample', listener);
   *
   * // unregister a listener for multiple event types
   * xs.removeListener('start sample', listener);
   */
  function removeListener(type, listener) {
    var me = this,
        events = me.events;

    each(type.split(' '), function(type) {
      var listeners = events && events[type] || [],
          index = indexOf(listeners, listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    });
    return me;
  }

  /**
   * Unregisters all listeners or those for the specified event type(s).
   *
   * @memberOf xStats
   * @param {String} type The event type.
   * @returns {Object} The xStats instance.
   * @example
   *
   * // unregister all listeners
   * xs.removeAllListeners();
   *
   * // unregister all listeners for an event type
   * xs.removeAllListeners('sample');
   *
   * // unregister all listeners for multiple event types
   * xs.removeAllListeners('start sample complete');
   */
  function removeAllListeners(type) {
    var me = this,
        events = me.events;

    each(type ? type.split(' ') : events, function(type) {
      (events && events[type] || []).length = 0;
    });
    return me;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * Creates the click event handler that controls swaping modes and redrawing
   * the display.
   *
   * @private
   * @param {Object} me The xStats instance.
   * @returns {Function} The event handler.
   */
  function createSwapMode(me) {
    return function() {
      if (!me.locked) {
        var mode = me.mode == 'fps' ? 'ms' : me.mode == 'ms' ? (memoryNS ? 'mem' : 'fps') : 'fps',
            element = me.element,
            nodes = me.canvas.childNodes,
            data = cache.data[mode],
            entry = data[0],
            length = nodes.length;

        me.mode = mode;
        setTitle(me, entry && entry.value);
        while (length--) {
          entry = data[length];
          setBar(me, nodes[length], entry && entry.percent);
        }
        removeClass(element, 'fps');
        removeClass(element, 'ms');
        removeClass(element, 'mem');
        addClass(element, mode);
      }
    };
  }

  /**
   * Records a value for the given mode.
   *
   * @private
   * @param {String} mode The mode to record.
   * @param {Mixed} value The value recorded.
   */
  function record(mode, value) {
    var data = cache.data[mode],
        percent = min(100, 100 * (value / (mode == 'fps' ? 80 : mode == 'ms' ? 1e3 : 128)));

    value = mode == 'mem' ? value.toFixed(2) : round(value);
    data.length = [data.length, data.unshift({ 'value': value, 'percent': percent })][0];

    value = floor(value);
    data.min = min(data.min != null ? data.min : value, value);
    data.max = max(data.max != null ? data.max : value, value);
  }

  /**
   * Sets the LI element's height based on the given value.
   *
   * @private
   * @param {Object} me The xStats instance.
   * @param {Object} node The LI element.
   * @param {Number} percent The bar height as a percentage.
   */
  function setBar(me, node, percent) {
    var height = 100,
        base = (height / 16) * 15,
        portion = (base / 100) * percent,
        value = percent != null ? (base - portion).toFixed(2) : height;

    node.style.height = value + '%';
  }

  /**
   * Sets a chart's title based on the given value.
   *
   * @private
   * @param {Object} me The xStats instance.
   * @param {Number} value The value.
   */
  function setTitle(me, value) {
    var mode = me.mode,
        unit = mode == 'mem' ? 'MB' : mode.toUpperCase(),
        data = cache.data[mode];

    me.title.nodeValue = value == null ? ' ' :
      value + unit + ' (' + data.min + '-' + data.max + ')';
  }

  /**
   * Updates chart data and display of all xStats instances.
   *
   * @private
   */
  function update() {
    var length,
        data = cache.data,
        frameTimes = cache.frameTimes,
        fps = 0,
        now = new Date,
        secValue = now - cache.lastSecond,
        lastSec = new Date - 1000;

    // skip first call
    if (cache.lastTime != null) {
      // record data
      frameTimes.push(new Date);
      record('ms', now - cache.lastTime);
      if (secValue > 999) {
        length = frameTimes.length;
        //console.log('length', length);
        while (length--) {
          if (frameTimes[length] < lastSec) {
            break;
          }
          fps++;
        }
        //console.log('fps', fps);
        record('fps', fps);
        memoryNS && record('mem', memoryNS.memory.usedJSHeapSize / 1048576);
        cache.frameTimes = frameTimes.slice(length);
        cache.lastSecond = now;
      }
      // render instances
      each(xStats.subclasses, function(subclass) {
        var canvas = subclass.canvas,
            mode = subclass.mode,
            entry = data[mode][0];

        if (entry && (mode == 'ms' || cache.lastSecond == now)) {
          setTitle(subclass, entry.value);
          setBar(subclass, canvas.insertBefore(canvas.lastChild, canvas.firstChild), entry.percent);
        }
      });
    }
    else {
      cache.lastSecond = now;
    }
    cache.lastTime = now;
  }

  /*--------------------------------------------------------------------------*/

  /**
   * An array of xStat instances.
   *
   * @static
   * @memberOf xStats
   * @type Array
   */
  xStats.subclasses = [];

  /*--------------------------------------------------------------------------*/

  extend(xStats.prototype, {

    /**
     * The height of the chart (px).
     *
     * @memberOf xStats
     * @type Number
     */
    'height': 48,

    /**
     * The width of the chart (px).
     *
     * @memberOf xStats
     * @type Number
     */
    'width': 94,

    /**
     * The inner padding of the chart that doesn't affect dimensions (px).
     *
     * @memberOf xStats
     * @type Number
     */
    'padding': 3,

    /**
     * A flag to indicate if the chart is locked at its current display mode.
     *
     * @memberOf xStats
     * @type Boolean
     */
    'locked': false,

    /**
     * The charts current display mode (fps, ms, mem).
     *
     * @memberOf xStats
     * @type String
     */
    'mode': 'fps',

    /**
     * The rate at which the "sample" event is emitted (secs).
     *
     * @memberOf xStats
     * @type Number
     */
    'sampleRate': 0,

    /**
     * Alias of [`xStats#addListener`](#xStats:addListener).
     *
     * @memberOf xStats
     * @type Function
     */
    'on': addListener,

    /**
     * The "frames per second" display mode options object.
     *
     * @memberOf xStats
     * @type Object
     */
    'fps': {

      /**
       * The background color of the chart for the display mode.
       *
       * @memberOf xStats#fps
       * @type String
       */
      'bg': '#282845',

      /**
       * The foreground color of the chart for the display mode.
       *
       * @memberOf xStats#fps
       * @type String
       */
      'fg': '#1affff'
    },

    /**
     * The "millisecond" display mode options object.
     *
     * @memberOf xStats
     * @type Object
     */
    'ms':  {

      /**
       * The background color of the chart for the display mode.
       *
       * @memberOf xStats#ms
       * @type String
       */
      'bg': '#284528',

      /**
       * The foreground color of the chart for the display mode.
       *
       * @memberOf xStats#ms
       * @type String
       */
      'fg': '#1aff1a'
    },

    /**
     * The "memory" display mode options object.
     *
     * @memberOf xStats
     * @type Object
     */
    'mem': {

      /**
       * The background color of the chart for the display mode.
       *
       * @memberOf xStats#mem
       * @type String
       */
      'bg': '#452831',

      /**
       * The foreground color of the chart for the display mode.
       *
       * @memberOf xStats#mem
       * @type String
       */
      'fg': '#ff1a8d'
    },

    // registers a single listener
    'addListener': addListener,

    // executes listeners of a specified type
    'emit': emit,

    // removes all listeners of a specified type
    'removeAllListeners': removeAllListeners,

    // removes a single listener
    'removeListener': removeListener
  });

  /*--------------------------------------------------------------------------*/

  /**
   * The event type.
   *
   * @memberOf xStats.Event
   * @type String
   */
  Event.prototype.type = '';

  /*--------------------------------------------------------------------------*/

  // expose Event
  xStats.Event = Event;

  // expose xStats
  // use square bracket notation so Closure Compiler won't munge `xStats`
  // http://code.google.com/closure/compiler/docs/api-tutorial3.html#export
  window['xStats'] = xStats;

  // ensure we can read memory info
  memoryNS = memoryNS && !!memoryNS.memory.usedJSHeapSize && memoryNS;

  // start recording
  setInterval(update, 1e3 / 60);

  // start sampling (once every two seconds)
  setInterval(function() {
    var data = cache.data,
        fps = data.fps[0],
        mem = data.mem[0],
        ms = data.ms[0];

    each(xStats.subclasses, function(subclass) {
      subclass.emit('sample', {
        'fps': fps && fps.value,
        'mem': mem && mem.value,
        'ms':  ms  && ms.value
      });
    });
  }, 2e3);

  // shared CSS
  appendCSS(
    '.xstats div{position:absolute;overflow:hidden}' +
    '.xstats p{margin:0;overflow:hidden;font-family:sans-serif;-webkit-text-size-adjust:100%}' +
    '.xstats ul{margin:0;padding:0;list-style:none;overflow:hidden}' +
    '.xstats li{float:right;height:100%;margin-left:-4px}' +
    '.xstats .bg{opacity:.5;filter:alpha(opacity=50)}' +
    '.xstats{cursor:pointer;-webkit-user-select:none;-khtml-user-select:none;-moz-user-select:none;-o-user-select:none;user-select:none}');

}(this, this.document));


document.oncontextmenu = function() {
  return false;
};

$(document).bind("keydown", function(event) {
  if (!$(event.target).is("input")) return event.preventDefault();
});

/**
The <code>Gamepads</code> module gives the engine access to gamepads.

    # First you need to add the `Gamepads` module to the engine
    Engine.defaultModules.push "Gamepads"

    window.engine = Engine
      ...

    # Then you need to get a controller reference
    # id = 0 for player 1, etc.
    controller = engine.controller(id)

    # Point indicating direction primary axis is held
    direction = controller.position()

    # Check if buttons are held
    controller.actionDown("A")
    controller.actionDown("B")
    controller.actionDown("X")
    controller.actionDown("Y")

@name Gamepads
@fieldOf Engine
@module

@param {Object} I Instance variables
@param {Object} self Reference to the engine
*/
Engine.Gamepads = function(I, self) {
  var gamepads;
  gamepads = Gamepads();
  self.bind("beforeUpdate", function() {
    return gamepads.update();
  });
  return {
    /**
    Get a controller for a given id.

    @name controller
    @methodOf Engine.Gamepads#

    @param {Number} index The index to get a controller for.
    */
    controller: function(index) {
      return gamepads.controller(index);
    }
  };
};


Engine.Stats = function(I, self) {
  var stats;
  if (I == null) I = {};
  stats = xStats();
  $(stats.element).css({
    position: "absolute",
    right: 0,
    top: 0
  }).appendTo("body");
  return {};
};

/**
This error handler captures any runtime errors and reports them to the IDE
if present.
*/
window.onerror = function(message, url, lineNumber) {
  var errorContext;
  errorContext = $('script').last().text().split('\n').slice(lineNumber - 5, (lineNumber + 4) + 1 || 9e9);
  errorContext[4] = "<b style='font-weight: bold; text-decoration: underline;'>" + errorContext[4] + "</b>";
  return typeof displayRuntimeError === "function" ? displayRuntimeError("<code>" + message + "</code> <br /><br />(Sometimes this context may be wrong.)<br /><code><pre>" + (errorContext.join('\n')) + "</pre></code>") : void 0;
};

var Gamepads;

Gamepads = function(I) {
  var controllers, snapshot, state;
  if (I == null) I = {};
  state = {};
  controllers = [];
  snapshot = function() {
    return Array.prototype.map.call(navigator.webkitGamepads || navigator.webkitGetGamepads(), function(x) {
      return {
        axes: x.axes,
        buttons: x.buttons
      };
    });
  };
  return {
    controller: function(index) {
      if (index == null) index = 0;
      return controllers[index] || (controllers[index] = Gamepads.Controller({
        index: index,
        state: state
      }));
    },
    update: function() {
      state.previous = state.current;
      state.current = snapshot();
      return controllers.each(function(controller) {
        return controller != null ? controller.update() : void 0;
      });
    }
  };
};

var __slice = Array.prototype.slice;

Gamepads.Controller = function(I) {
  var AXIS_MAX, BUTTON_THRESHOLD, DEAD_ZONE, MAX_BUFFER, TRIP_HIGH, TRIP_LOW, axisTrips, buttonMapping, currentState, previousState, processTaps, self, tap;
  if (I == null) I = {};
  Object.reverseMerge(I, {
    debugColor: "#000"
  });
  MAX_BUFFER = 0.03;
  AXIS_MAX = 1 - MAX_BUFFER;
  DEAD_ZONE = AXIS_MAX * 0.2;
  TRIP_HIGH = AXIS_MAX * 0.75;
  TRIP_LOW = AXIS_MAX * 0.5;
  BUTTON_THRESHOLD = 0.5;
  buttonMapping = {
    "A": 0,
    "B": 1,
    "C": 2,
    "D": 3,
    "X": 2,
    "Y": 3,
    "L": 4,
    "LB": 4,
    "L1": 4,
    "R": 5,
    "RB": 5,
    "R1": 5,
    "SELECT": 6,
    "BACK": 6,
    "START": 7,
    "HOME": 8,
    "GUIDE": 8,
    "TL": 9,
    "TR": 10
  };
  currentState = function() {
    var _ref;
    return (_ref = I.state.current) != null ? _ref[I.index] : void 0;
  };
  previousState = function() {
    var _ref;
    return (_ref = I.state.previous) != null ? _ref[I.index] : void 0;
  };
  axisTrips = [];
  tap = Point(0, 0);
  processTaps = function() {
    var x, y, _ref;
    _ref = [0, 1].map(function(n) {
      if (!axisTrips[n] && self.axis(n).abs() > TRIP_HIGH) {
        axisTrips[n] = true;
        return self.axis(n).sign();
      }
      if (axisTrips[n] && self.axis(n).abs() < TRIP_LOW) axisTrips[n] = false;
      return 0;
    }), x = _ref[0], y = _ref[1];
    return tap = Point(x, y);
  };
  return self = Core().include(Bindable).extend({
    actionDown: function() {
      var buttons, state;
      buttons = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      if (state = currentState()) {
        return buttons.inject(false, function(down, button) {
          return down || (button === "ANY" ? state.buttons.inject(false, function(down, button) {
            return down || (button > BUTTON_THRESHOLD);
          }) : state.buttons[buttonMapping[button]] > BUTTON_THRESHOLD);
        });
      } else {
        return false;
      }
    },
    buttonPressed: function(button) {
      var buttonId, _ref;
      buttonId = buttonMapping[button];
      return (self.buttons()[buttonId] > BUTTON_THRESHOLD) && !(((_ref = previousState()) != null ? _ref.buttons[buttonId] : void 0) > BUTTON_THRESHOLD);
    },
    position: function(stick) {
      var magnitude, p, ratio, state;
      if (stick == null) stick = 0;
      if (state = currentState()) {
        p = Point(self.axis(2 * stick), self.axis(2 * stick + 1));
        magnitude = p.magnitude();
        if (magnitude > AXIS_MAX) {
          return p.norm();
        } else if (magnitude < DEAD_ZONE) {
          return Point(0, 0);
        } else {
          ratio = magnitude / AXIS_MAX;
          return p.scale(ratio / AXIS_MAX);
        }
      } else {
        return Point(0, 0);
      }
    },
    axis: function(n) {
      return self.axes()[n] || 0;
    },
    axes: function() {
      var state;
      if (state = currentState()) {
        return state.axes;
      } else {
        return [];
      }
    },
    buttons: function() {
      var state;
      if (state = currentState()) {
        return state.buttons;
      } else {
        return [];
      }
    },
    tap: function() {
      return tap;
    },
    update: function() {
      return processTaps();
    },
    drawDebug: function(canvas) {
      var lineHeight;
      lineHeight = 18;
      self.axes().each(function(axis, i) {
        return canvas.drawText({
          color: I.debugColor,
          text: axis,
          x: 0,
          y: i * lineHeight
        });
      });
      return self.buttons().each(function(button, i) {
        return canvas.drawText({
          color: I.debugColor,
          text: button,
          x: 250,
          y: i * lineHeight
        });
      });
    }
  });
};

var Joysticks,
  __slice = Array.prototype.slice;

Joysticks = (function() {
  var AXIS_MAX, Controller, DEAD_ZONE, MAX_BUFFER, TRIP_HIGH, TRIP_LOW, axisMappingDefault, axisMappingOSX, buttonMappingDefault, buttonMappingOSX, controllers, displayInstallPrompt, joysticks, plugin, previousJoysticks, type;
  type = "application/x-boomstickjavascriptjoysticksupport";
  plugin = null;
  MAX_BUFFER = 2000;
  AXIS_MAX = 32767 - MAX_BUFFER;
  DEAD_ZONE = AXIS_MAX * 0.2;
  TRIP_HIGH = AXIS_MAX * 0.75;
  TRIP_LOW = AXIS_MAX * 0.5;
  previousJoysticks = [];
  joysticks = [];
  controllers = [];
  buttonMappingDefault = {
    "A": 1,
    "B": 2,
    "C": 4,
    "D": 8,
    "X": 4,
    "Y": 8,
    "R": 32,
    "RB": 32,
    "R1": 32,
    "L": 16,
    "LB": 16,
    "L1": 16,
    "SELECT": 64,
    "BACK": 64,
    "START": 128,
    "HOME": 256,
    "GUIDE": 256,
    "TL": 512,
    "TR": 1024,
    "ANY": 0xFFFFFF
  };
  buttonMappingOSX = {
    "A": 2048,
    "B": 4096,
    "C": 8192,
    "D": 16384,
    "X": 8192,
    "Y": 16384,
    "R": 512,
    "L": 256,
    "SELECT": 32,
    "BACK": 32,
    "START": 16,
    "HOME": 1024,
    "LT": 64,
    "TR": 128,
    "ANY": 0xFFFFFF0
  };
  axisMappingDefault = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5
  };
  axisMappingOSX = {
    0: 2,
    1: 3,
    2: 4,
    3: 5,
    4: 0,
    5: 1
  };
  displayInstallPrompt = function(text, url) {
    return $("<a />", {
      css: {
        backgroundColor: "yellow",
        boxSizing: "border-box",
        color: "#000",
        display: "block",
        fontWeight: "bold",
        left: 0,
        padding: "1em",
        position: "absolute",
        textDecoration: "none",
        top: 0,
        width: "100%",
        zIndex: 2000
      },
      href: url,
      target: "_blank",
      text: text
    }).appendTo("body");
  };
  Controller = function(i, remapOSX) {
    var axisMapping, axisTrips, buttonMapping, currentState, previousState, self;
    if (remapOSX === void 0) remapOSX = navigator.platform.match(/^Mac/);
    if (remapOSX) {
      buttonMapping = buttonMappingOSX;
      axisMapping = axisMappingOSX;
    } else {
      buttonMapping = buttonMappingDefault;
      axisMapping = axisMappingDefault;
    }
    currentState = function() {
      return joysticks[i];
    };
    previousState = function() {
      return previousJoysticks[i];
    };
    axisTrips = [];
    return self = Core().include(Bindable).extend({
      actionDown: function() {
        var buttons, state;
        buttons = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        if (state = currentState()) {
          return buttons.inject(false, function(down, button) {
            return down || state.buttons & buttonMapping[button];
          });
        } else {
          return false;
        }
      },
      buttonPressed: function(button) {
        var buttonId;
        buttonId = buttonMapping[button];
        return (self.buttons() & buttonId) && !(previousState().buttons & buttonId);
      },
      position: function(stick) {
        var magnitude, p, ratio, state;
        if (stick == null) stick = 0;
        if (state = currentState()) {
          p = Point(self.axis(2 * stick), self.axis(2 * stick + 1));
          magnitude = p.magnitude();
          if (magnitude > AXIS_MAX) {
            return p.norm();
          } else if (magnitude < DEAD_ZONE) {
            return Point(0, 0);
          } else {
            ratio = magnitude / AXIS_MAX;
            return p.scale(ratio / AXIS_MAX);
          }
        } else {
          return Point(0, 0);
        }
      },
      axis: function(n) {
        n = axisMapping[n];
        return self.axes()[n] || 0;
      },
      axes: function() {
        var state;
        if (state = currentState()) {
          return state.axes;
        } else {
          return [];
        }
      },
      buttons: function() {
        var state;
        if (state = currentState()) return state.buttons;
      },
      processEvents: function() {
        var x, y, _ref;
        _ref = [0, 1].map(function(n) {
          if (!axisTrips[n] && self.axis(n).abs() > TRIP_HIGH) {
            axisTrips[n] = true;
            return self.axis(n).sign();
          }
          if (axisTrips[n] && self.axis(n).abs() < TRIP_LOW) axisTrips[n] = false;
          return 0;
        }), x = _ref[0], y = _ref[1];
        if (!x || !y) return self.trigger("tap", Point(x, y));
      },
      drawDebug: function(canvas) {
        var axis, i, lineHeight, _len, _ref;
        lineHeight = 18;
        canvas.fillColor("#FFF");
        _ref = self.axes();
        for (i = 0, _len = _ref.length; i < _len; i++) {
          axis = _ref[i];
          canvas.fillText(axis, 0, i * lineHeight);
        }
        return canvas.fillText(self.buttons(), 0, i * lineHeight);
      }
    });
  };
  return {
    getController: function(i) {
      return controllers[i] || (controllers[i] = Controller(i));
    },
    init: function() {
      var periodicCheck, promptElement;
      if (!plugin) {
        plugin = document.createElement("object");
        plugin.type = type;
        plugin.width = 0;
        plugin.height = 0;
        $("body").append(plugin);
        plugin.maxAxes = 6;
        if (!plugin.status) {
          promptElement = displayInstallPrompt("Your browser does not yet handle joysticks, please click here to install the Boomstick plugin!", "https://github.com/STRd6/Boomstick/wiki");
          periodicCheck = function() {
            if (plugin.status) {
              return promptElement.remove();
            } else {
              return setTimeout(periodicCheck, 500);
            }
          };
          return periodicCheck();
        }
      }
    },
    status: function() {
      return plugin != null ? plugin.status : void 0;
    },
    update: function() {
      var controller, _i, _len, _results;
      if (plugin.joysticksJSON) {
        previousJoysticks = joysticks;
        joysticks = JSON.parse(plugin.joysticksJSON());
      }
      _results = [];
      for (_i = 0, _len = controllers.length; _i < _len; _i++) {
        controller = controllers[_i];
        _results.push(controller != null ? controller.processEvents() : void 0);
      }
      return _results;
    },
    joysticks: function() {
      return joysticks;
    }
  };
})();

/**
jQuery Hotkeys Plugin
Copyright 2010, John Resig
Dual licensed under the MIT or GPL Version 2 licenses.

Based upon the plugin by Tzury Bar Yochay:
http://github.com/tzuryby/hotkeys

Original idea by:
Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/
(function(jQuery) {
  var isFunctionKey, isTextAcceptingInput, keyHandler;
  isTextAcceptingInput = function(element) {
    return /textarea|select/i.test(element.nodeName) || element.type === "text" || element.type === "password";
  };
  isFunctionKey = function(event) {
    var _ref;
    return (event.type !== "keypress") && ((112 <= (_ref = event.which) && _ref <= 123));
  };
  jQuery.hotkeys = {
    version: "0.8",
    specialKeys: {
      8: "backspace",
      9: "tab",
      13: "return",
      16: "shift",
      17: "ctrl",
      18: "alt",
      19: "pause",
      20: "capslock",
      27: "esc",
      32: "space",
      33: "pageup",
      34: "pagedown",
      35: "end",
      36: "home",
      37: "left",
      38: "up",
      39: "right",
      40: "down",
      45: "insert",
      46: "del",
      96: "0",
      97: "1",
      98: "2",
      99: "3",
      100: "4",
      101: "5",
      102: "6",
      103: "7",
      104: "8",
      105: "9",
      106: "*",
      107: "+",
      109: "-",
      110: ".",
      111: "/",
      112: "f1",
      113: "f2",
      114: "f3",
      115: "f4",
      116: "f5",
      117: "f6",
      118: "f7",
      119: "f8",
      120: "f9",
      121: "f10",
      122: "f11",
      123: "f12",
      144: "numlock",
      145: "scroll",
      186: ";",
      187: "=",
      188: ",",
      189: "-",
      190: ".",
      191: "/",
      219: "[",
      220: "\\",
      221: "]",
      222: "'",
      224: "meta"
    },
    shiftNums: {
      "`": "~",
      "1": "!",
      "2": "@",
      "3": "#",
      "4": "$",
      "5": "%",
      "6": "^",
      "7": "&",
      "8": "*",
      "9": "(",
      "0": ")",
      "-": "_",
      "=": "+",
      ";": ":",
      "'": "\"",
      ",": "<",
      ".": ">",
      "/": "?",
      "\\": "|"
    }
  };
  keyHandler = function(handleObj) {
    var keys, origHandler;
    if (typeof handleObj.data !== "string") return;
    origHandler = handleObj.handler;
    keys = handleObj.data.toLowerCase().split(" ");
    return handleObj.handler = function(event) {
      var character, key, modif, possible, special, target, _i, _len;
      special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[event.which];
      character = String.fromCharCode(event.which).toLowerCase();
      modif = "";
      possible = {};
      target = event.target;
      if (event.altKey && special !== "alt") modif += "alt+";
      if (event.ctrlKey && special !== "ctrl") modif += "ctrl+";
      if (event.metaKey && !event.ctrlKey && special !== "meta") modif += "meta+";
      if (this !== target) {
        if (isTextAcceptingInput(target) && !modif && !isFunctionKey(event)) {
          return;
        }
      }
      if (event.shiftKey && special !== "shift") modif += "shift+";
      if (special) {
        possible[modif + special] = true;
      } else {
        possible[modif + character] = true;
        possible[modif + jQuery.hotkeys.shiftNums[character]] = true;
        if (modif === "shift+") {
          possible[jQuery.hotkeys.shiftNums[character]] = true;
        }
      }
      for (_i = 0, _len = keys.length; _i < _len; _i++) {
        key = keys[_i];
        if (possible[key]) return origHandler.apply(this, arguments);
      }
    };
  };
  return jQuery.each(["keydown", "keyup", "keypress"], function() {
    return jQuery.event.special[this] = {
      add: keyHandler
    };
  });
})(jQuery);

/**
Merges properties from objects into target without overiding.
First come, first served.

@name reverseMerge
@methodOf jQuery#

@param {Object} target the object to merge the given properties onto
@param {Object} objects... one or more objects whose properties are merged onto target

@return {Object} target
*/
var __slice = Array.prototype.slice;

jQuery.extend({
  reverseMerge: function() {
    var name, object, objects, target, _i, _len;
    target = arguments[0], objects = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    for (_i = 0, _len = objects.length; _i < _len; _i++) {
      object = objects[_i];
      for (name in object) {
        if (!target.hasOwnProperty(name)) target[name] = object[name];
      }
    }
    return target;
  }
});


$(function() {
  /**
  The global keydown property lets your query the status of keys.

  <code><pre>
  if keydown.left
    moveLeft()

  if keydown.a or keydown.space
    attack()

  if keydown.return
    confirm()

  if keydown.esc
    cancel()
  </pre></code>

  @name keydown
  @namespace
  */
  /**
  The global justPressed property lets your query the status of keys. However,
  unlike keydown it will only trigger once for each time the key is pressed.

  <code><pre>
  if justPressed.left
    moveLeft()

  if justPressed.a or justPressed.space
    attack()

  if justPressed.return
    confirm()

  if justPressed.esc
    cancel()
  </pre></code>

  @name justPressed
  @namespace
  */
  var keyName, prevKeysDown;
  window.keydown = {};
  window.justPressed = {};
  prevKeysDown = {};
  keyName = function(event) {
    return jQuery.hotkeys.specialKeys[event.which] || String.fromCharCode(event.which).toLowerCase();
  };
  $(document).bind("keydown", function(event) {
    var key;
    key = keyName(event);
    return keydown[key] = true;
  });
  $(document).bind("keyup", function(event) {
    var key;
    key = keyName(event);
    return keydown[key] = false;
  });
  return window.updateKeys = function() {
    var key, value, _results;
    window.justPressed = {};
    keydown.any = false;
    for (key in keydown) {
      value = keydown[key];
      if (!prevKeysDown[key]) justPressed[key] = value;
      if (justPressed[key] || mousePressed.left || mousePressed.right) {
        justPressed.any = true;
      }
      if (value || mouseDown.left || mouseDown.right) keydown.any = true;
    }
    prevKeysDown = {};
    _results = [];
    for (key in keydown) {
      value = keydown[key];
      _results.push(prevKeysDown[key] = value);
    }
    return _results;
  };
});


$(function() {
  /**
  The global mouseDown property lets your query the status of mouse buttons.

  <code><pre>
  if mouseDown.left
    moveLeft()

  if mouseDown.right
    attack()
  </pre></code>

  @name mouseDown
  @namespace
  */
  /**
  The global mousePressed property lets your query the status of mouse buttons.
  However, unlike mouseDown it will only trigger the first time the button
  pressed.

  <code><pre>
  if mousePressed.left
    moveLeft()

  if mousePressed.right
    attack()
  </pre></code>

  @name mousePressed
  @namespace
  */
  var buttonName, buttonNames, prevButtonsDown;
  window.mouseDown = {};
  window.mousePressed = {};
  window.mousePosition = Point(0, 0);
  prevButtonsDown = {};
  buttonNames = {
    1: "left",
    2: "middle",
    3: "right"
  };
  buttonName = function(event) {
    return buttonNames[event.which];
  };
  $(document).bind("mousemove", function(event) {
    mousePosition.x = event.pageX;
    return mousePosition.y = event.pageY;
  });
  $(document).bind("mousedown", function(event) {
    return mouseDown[buttonName(event)] = true;
  });
  $(document).bind("mouseup", function(event) {
    return mouseDown[buttonName(event)] = false;
  });
  return window.updateMouse = function() {
    var button, value, _results;
    window.mousePressed = {};
    for (button in mouseDown) {
      value = mouseDown[button];
      if (!prevButtonsDown[button]) mousePressed[button] = value;
    }
    prevButtonsDown = {};
    _results = [];
    for (button in mouseDown) {
      value = mouseDown[button];
      _results.push(prevButtonsDown[button] = value);
    }
    return _results;
  };
});

/**
The Music object provides an easy API to play
songs from your sounds project directory. By
default, the track is looped.

<code><pre>
  Music.play('intro_theme')
</pre></code>

@name Music
@namespace
*/
var Music;

Music = (function() {
  var globalMusicVolume, track, trackVolume, updateTrackVolume;
  globalMusicVolume = 1;
  trackVolume = 1;
  track = $("<audio />", {
    loop: "loop"
  }).appendTo('body').get(0);
  updateTrackVolume = function() {
    return track.volume = globalMusicVolume * trackVolume;
  };
  return {
    /**
    Set the global volume modifier for all music.

    Any value set is clamped between 0 and 1. This is multiplied
    into each individual track that plays.

    If no argument is given return the current global music volume.

    @name globalVolume
    @methodOf Music
    @param {Number} [newVolume] The volume to set
    */
    globalVolume: function(newVolume) {
      if (newVolume != null) {
        globalMusicVolume = newVolume.clamp(0, 1);
        updateTrackVolume();
      }
      return globalMusicVolume;
    },
    /**
    Plays a music track.

    @name play
    @methodOf Music
    @param {String} name The name of the track to play.
    */
    play: function(name) {
      updateTrackVolume();

      if(name) {
        track.src = "" + BASE_URL + "/music/" + name + ".ogg";
      }

      return track.play();
    },

    pause: function() {
      track.pause();
    },
    /**
    Get or set the current music volume. Any value passed is
    clamped between 0 and 1. Use this to adjust the volume of
    individual tracks or to increase or decrease volume during
    gameplay.

    @name volume
    @methodOf Music
    @param {Number} [newVolume] The volume to set to.
    */
    volume: function(newVolume) {
      if (newVolume != null) {
        trackVolume = newVolume.clamp(0, 1);
        updateTrackVolume();
        return this;
      } else {
        return trackVolume;
      }
    }
  };
})();

var __slice = Array.prototype.slice;

(function($) {
  return $.fn.pixieCanvas = function(options) {
    var $canvas, canvas, canvasAttrAccessor, context, contextAttrAccessor;
    if (options == null) options = {};
    canvas = this.get(0);
    context = void 0;
    /**
    PixieCanvas provides a convenient wrapper for working with Context2d.

    Methods try to be as flexible as possible as to what arguments they take.

    Non-getter methods return `this` for method chaining.

    @name PixieCanvas
    @constructor
    */
    $canvas = $(canvas).extend({
      /**
      Passes this canvas to the block with the given matrix transformation
      applied. All drawing methods called within the block will draw
      into the canvas with the transformation applied. The transformation
      is removed at the end of the block, even if the block throws an error.

      @name withTransform
      @methodOf PixieCanvas#

      @param {Matrix} matrix
      @param {Function} block

      @returns {PixieCanvas} this
      */
      withTransform: function(matrix, block) {
        context.save();
        context.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.tx, matrix.ty);
        try {
          block(this);
        } finally {
          context.restore();
        }
        return this;
      },
      /**
      Clear the canvas (or a portion of it).

      Clear the entire canvas

      <code><pre>
      canvas.clear()
      </pre></code>

      Clear a portion of the canvas

      <code class="run"><pre>
      # Set up: Fill canvas with blue
      canvas.fill("blue")

      # Clear a portion of the canvas
      canvas.clear
        x: 50
        y: 50
        width: 50
        height: 50
      </pre></code>

      You can also clear the canvas by passing x, y, width height as
      unnamed parameters:

      <code><pre>
      canvas.clear(25, 25, 50, 50)
      </pre></code>

      @name clear
      @methodOf PixieCanvas#

      @param {Number} [x] where to start clearing on the x axis
      @param {Number} [y] where to start clearing on the y axis
      @param {Number} [width] width of area to clear
      @param {Number} [height] height of area to clear

      @returns {PixieCanvas} this
      */
      clear: function(x, y, width, height) {
        var _ref;
        if (x == null) x = {};
        if (y == null) {
          _ref = x, x = _ref.x, y = _ref.y, width = _ref.width, height = _ref.height;
        }
        x || (x = 0);
        y || (y = 0);
        if (width == null) width = canvas.width;
        if (height == null) height = canvas.height;
        context.clearRect(x, y, width, height);
        return this;
      },
      /**
      Fills the entire canvas (or a specified section of it) with
      the given color.

      <code class="run"><pre>
      # Paint the town (entire canvas) red
      canvas.fill "red"

      # Fill a section of the canvas white (#FFF)
      canvas.fill
        x: 50
        y: 50
        width: 50
        height: 50
        color: "#FFF"
      </pre></code>

      @name fill
      @methodOf PixieCanvas#

      @param {Number} [x=0] Optional x position to fill from
      @param {Number} [y=0] Optional y position to fill from
      @param {Number} [width=canvas.width] Optional width of area to fill
      @param {Number} [height=canvas.height] Optional height of area to fill
      @param {Bounds} [bounds] bounds object to fill
      @param {String|Color} [color] color of area to fill

      @returns {PixieCanvas} this
      */
      fill: function(color) {
        var bounds, height, width, x, y, _ref;
        if (color == null) color = {};
        if (!((typeof color.isString === "function" ? color.isString() : void 0) || color.channels)) {
          _ref = color, x = _ref.x, y = _ref.y, width = _ref.width, height = _ref.height, bounds = _ref.bounds, color = _ref.color;
        }
        if (bounds) {
          x = bounds.x, y = bounds.y, width = bounds.width, height = bounds.height;
        }
        x || (x = 0);
        y || (y = 0);
        if (width == null) width = canvas.width;
        if (height == null) height = canvas.height;
        this.fillColor(color);
        context.fillRect(x, y, width, height);
        return this;
      },
      /**
      A direct map to the Context2d draw image. `GameObject`s
      that implement drawable will have this wrapped up nicely,
      so there is a good chance that you will not have to deal with
      it directly.

      @name drawImage
      @methodOf PixieCanvas#

      @param image
      @param {Number} sx
      @param {Number} sy
      @param {Number} sWidth
      @param {Number} sHeight
      @param {Number} dx
      @param {Number} dy
      @param {Number} dWidth
      @param {Number} dHeight

      @returns {PixieCanvas} this
      */
      drawImage: function(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        context.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        return this;
      },
      /**
      Draws a circle at the specified position with the specified
      radius and color.

      <code class="run"><pre>
      # Draw a large orange circle
      canvas.drawCircle
        radius: 30
        position: Point(100, 75)
        color: "orange"

      # Draw a blue circle with radius 10 at (25, 50)
      # and a red stroke
      canvas.drawCircle
        x: 25
        y: 50
        radius: 10
        color: "blue"
        stroke:
          color: "red"
          width: 1

      # Create a circle object to set up the next examples
      circle =
        radius: 20
        x: 50
        y: 50

      # Draw a given circle in yellow
      canvas.drawCircle
        circle: circle
        color: "yellow"

      # Draw the circle in green at a different position
      canvas.drawCircle
        circle: circle
        position: Point(25, 75)
        color: "green"

      # Draw an outline circle in purple.
      canvas.drawCircle
        x: 50
        y: 75
        radius: 10
        stroke:
          color: "purple"
          width: 2
      </pre></code>

      @name drawCircle
      @methodOf PixieCanvas#

      @param {Number} [x] location on the x axis to start drawing
      @param {Number} [y] location on the y axis to start drawing
      @param {Point} [position] position object of location to start drawing. This will override x and y values passed
      @param {Number} [radius] length of the radius of the circle
      @param {Color|String} [color] color of the circle
      @param {Circle} [circle] circle object that contains position and radius. Overrides x, y, and radius if passed
      @param {Stroke} [stroke] stroke object that specifies stroke color and stroke width

      @returns {PixieCanvas} this
      */
      drawCircle: function(_arg) {
        var circle, color, position, radius, stroke, x, y;
        x = _arg.x, y = _arg.y, radius = _arg.radius, position = _arg.position, color = _arg.color, stroke = _arg.stroke, circle = _arg.circle;
        if (circle) x = circle.x, y = circle.y, radius = circle.radius;
        if (position) x = position.x, y = position.y;
        context.beginPath();
        context.arc(x, y, radius, 0, Math.TAU, true);
        context.closePath();
        if (color) {
          this.fillColor(color);
          context.fill();
        }
        if (stroke) {
          this.strokeColor(stroke.color);
          this.lineWidth(stroke.width);
          context.stroke();
        }
        return this;
      },
      /**
      Draws a rectangle at the specified position with given
      width and height. Optionally takes a position, bounds
      and color argument.

      <code class="run"><pre>
      # Draw a red rectangle using x, y, width and height
      canvas.drawRect
        x: 50
        y: 50
        width: 50
        height: 50
        color: "#F00"

      # Draw a blue rectangle using position, width and height
      # and throw in a stroke for good measure
      canvas.drawRect
        position: Point(0, 0)
        width: 50
        height: 50
        color: "blue"
        stroke:
          color: "orange"
          width: 3

      # Set up a bounds object for the next examples
      bounds =
        x: 100
        y: 0
        width: 100
        height: 100

      # Draw a purple rectangle using bounds
      canvas.drawRect
        bounds: bounds
        color: "green"

      # Draw the outline of the same bounds, but at a different position
      canvas.drawRect
        bounds: bounds
        position: Point(0, 50)
        stroke:
          color: "purple"
          width: 2
      </pre></code>

      @name drawRect
      @methodOf PixieCanvas#

      @param {Number} [x] location on the x axis to start drawing
      @param {Number} [y] location on the y axis to start drawing
      @param {Number} [width] width of rectangle to draw
      @param {Number} [height] height of rectangle to draw
      @param {Point} [position] position to start drawing. Overrides x and y if passed
      @param {Color|String} [color] color of rectangle
      @param {Bounds} [bounds] bounds of rectangle. Overrides x, y, width, height if passed
      @param {Stroke} [stroke] stroke object that specifies stroke color and stroke width

      @returns {PixieCanvas} this
      */
      drawRect: function(_arg) {
        var bounds, color, height, position, stroke, width, x, y;
        x = _arg.x, y = _arg.y, width = _arg.width, height = _arg.height, position = _arg.position, bounds = _arg.bounds, color = _arg.color, stroke = _arg.stroke;
        if (bounds) {
          x = bounds.x, y = bounds.y, width = bounds.width, height = bounds.height;
        }
        if (position) x = position.x, y = position.y;
        if (color) {
          this.fillColor(color);
          context.fillRect(x, y, width, height);
        }
        if (stroke) {
          this.strokeColor(stroke.color);
          this.lineWidth(stroke.width);
          context.strokeRect(x, y, width, height);
        }
        return this;
      },
      /**
      Draw a line from `start` to `end`.

      <code class="run"><pre>
      # Draw a sweet diagonal
      canvas.drawLine
        start: Point(0, 0)
        end: Point(200, 200)
        color: "purple"

      # Draw another sweet diagonal
      canvas.drawLine
        start: Point(200, 0)
        end: Point(0, 200)
        color: "red"
        width: 6

      # Now draw a sweet horizontal with a direction and a length
      canvas.drawLine
        start: Point(0, 100)
        length: 200
        direction: Point(1, 0)
        color: "orange"

      </pre></code>

      @name drawLine
      @methodOf PixieCanvas#

      @param {Point} start position to start drawing from
      @param {Point} [end] position to stop drawing
      @param {Number} [width] width of the line
      @param {String|Color} [color] color of the line

      @returns {PixieCanvas} this
      */
      drawLine: function(_arg) {
        var color, direction, end, length, start, width;
        start = _arg.start, end = _arg.end, width = _arg.width, color = _arg.color, direction = _arg.direction, length = _arg.length;
        width || (width = 3);
        if (direction) end = direction.norm(length).add(start);
        this.lineWidth(width);
        this.strokeColor(color);
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.closePath();
        context.stroke();
        return this;
      },
      /**
      Draw a polygon.

      <code class="run"><pre>
      # Draw a sweet rhombus
      canvas.drawPoly
        points: [
          Point(50, 25)
          Point(75, 50)
          Point(50, 75)
          Point(25, 50)
        ]
        color: "purple"
        stroke:
          color: "red"
          width: 2
      </pre></code>

      @name drawPoly
      @methodOf PixieCanvas#

      @param {Point[]} [points] collection of points that define the vertices of the polygon
      @param {String|Color} [color] color of the polygon
      @param {Stroke} [stroke] stroke object that specifies stroke color and stroke width

      @returns {PixieCanvas} this
      */
      drawPoly: function(_arg) {
        var color, points, stroke;
        points = _arg.points, color = _arg.color, stroke = _arg.stroke;
        context.beginPath();
        points.each(function(point, i) {
          if (i === 0) {
            return context.moveTo(point.x, point.y);
          } else {
            return context.lineTo(point.x, point.y);
          }
        });
        context.lineTo(points[0].x, points[0].y);
        if (color) {
          this.fillColor(color);
          context.fill();
        }
        if (stroke) {
          this.strokeColor(stroke.color);
          this.lineWidth(stroke.width);
          context.stroke();
        }
        return this;
      },
      /**
      Draw a rounded rectangle.

      Adapted from http://js-bits.blogspot.com/2010/07/canvas-rounded-corner-rectangles.html

      <code class="run"><pre>
      # Draw a purple rounded rectangle with a red outline
      canvas.drawRoundRect
        position: Point(25, 25)
        radius: 10
        width: 150
        height: 100
        color: "purple"
        stroke:
          color: "red"
          width: 2
      </pre></code>

      @name drawRoundRect
      @methodOf PixieCanvas#

      @param {Number} [x] location on the x axis to start drawing
      @param {Number} [y] location on the y axis to start drawing
      @param {Number} [width] width of the rounded rectangle
      @param {Number} [height] height of the rounded rectangle
      @param {Number} [radius=5] radius to round the rectangle corners
      @param {Point} [position] position to start drawing. Overrides x and y if passed
      @param {Color|String} [color] color of the rounded rectangle
      @param {Bounds} [bounds] bounds of the rounded rectangle. Overrides x, y, width, and height if passed
      @param {Stroke} [stroke] stroke object that specifies stroke color and stroke width

      @returns {PixieCanvas} this
      */
      drawRoundRect: function(_arg) {
        var bounds, color, height, position, radius, stroke, width, x, y;
        x = _arg.x, y = _arg.y, width = _arg.width, height = _arg.height, radius = _arg.radius, position = _arg.position, bounds = _arg.bounds, color = _arg.color, stroke = _arg.stroke;
        if (radius == null) radius = 5;
        if (bounds) {
          x = bounds.x, y = bounds.y, width = bounds.width, height = bounds.height;
        }
        if (position) x = position.x, y = position.y;
        context.beginPath();
        context.moveTo(x + radius, y);
        context.lineTo(x + width - radius, y);
        context.quadraticCurveTo(x + width, y, x + width, y + radius);
        context.lineTo(x + width, y + height - radius);
        context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        context.lineTo(x + radius, y + height);
        context.quadraticCurveTo(x, y + height, x, y + height - radius);
        context.lineTo(x, y + radius);
        context.quadraticCurveTo(x, y, x + radius, y);
        context.closePath();
        if (color) {
          this.fillColor(color);
          context.fill();
        }
        if (stroke) {
          this.lineWidth(stroke.width);
          this.strokeColor(stroke.color);
          context.stroke();
        }
        return this;
      },
      /**
      Draws text on the canvas at the given position, in the given color.
      If no color is given then the previous fill color is used.

      <code class="run"><pre>
      # Fill canvas to indicate bounds
      canvas.fill
        color: '#eee'

      # A line to indicate the baseline
      canvas.drawLine
        start: Point(25, 50)
        end: Point(125, 50)
        color: "#333"
        width: 1

      # Draw some text, note the position of the baseline
      canvas.drawText
        position: Point(25, 50)
        color: "red"
        text: "It's dangerous to go alone"

      </pre></code>

      @name drawText
      @methodOf PixieCanvas#

      @param {Number} [x] location on x axis to start printing
      @param {Number} [y] location on y axis to start printing
      @param {String} text text to print
      @param {Point} [position] position to start printing. Overrides x and y if passed
      @param {String|Color} [color] color of text to start printing
      @param {String} [font] font of text to print

      @returns {PixieCanvas} this
      */
      drawText: function(_arg) {
        var color, font, position, text, x, y;
        x = _arg.x, y = _arg.y, text = _arg.text, position = _arg.position, color = _arg.color, font = _arg.font;
        if (position) x = position.x, y = position.y;
        this.fillColor(color);
        if (font) this.font(font);
        context.fillText(text, x, y);
        return this;
      },
      /**
      Centers the given text on the canvas at the given y position. An x position
      or point position can also be given in which case the text is centered at the
      x, y or position value specified.

      <code class="run"><pre>
      # Fill canvas to indicate bounds
      canvas.fill
        color: "#eee"

      # A line to indicate the baseline
      canvas.drawLine
        start: Point(25, 25)
        end: Point(125, 25)
        color: "#333"
        width: 1

      # Center text on the screen at y value 25
      canvas.centerText
        y: 25
        color: "red"
        text: "It's dangerous to go alone"

      # Center text at point (75, 75)
      canvas.centerText
        position: Point(75, 75)
        color: "green"
        text: "take this"

      </pre></code>

      @name centerText
      @methodOf PixieCanvas#

      @param {String} text Text to print
      @param {Number} [y] location on the y axis to start printing
      @param {Number} [x] location on the x axis to start printing. Overrides the default centering behavior if passed
      @param {Point} [position] position to start printing. Overrides x and y if passed
      @param {String|Color} [color] color of text to print
      @param {String} [font] font of text to print

      @returns {PixieCanvas} this
      */
      centerText: function(_arg) {
        var color, font, position, text, textWidth, x, y;
        text = _arg.text, x = _arg.x, y = _arg.y, position = _arg.position, color = _arg.color, font = _arg.font;
        if (position) x = position.x, y = position.y;
        if (x == null) x = canvas.width / 2;
        textWidth = this.measureText(text);
        return this.drawText({
          text: text,
          color: color,
          font: font,
          x: x - textWidth / 2,
          y: y
        });
      },
      /**
      A getter / setter method to set the canvas fillColor.

      <code><pre>
      # Set the fill color
      canvas.fillColor('#FF0000')

      # Passing no arguments returns the fillColor
      canvas.fillColor()
      # => '#FF0000'

      # You can also pass a Color object
      canvas.fillColor(Color('sky blue'))
      </pre></code>

      @name fillColor
      @methodOf PixieCanvas#

      @param {String|Color} [color] color to make the canvas fillColor

      @returns {PixieCanvas} this
      */
      fillColor: function(color) {
        if (color) {
          if (color.channels) {
            context.fillStyle = color.toString();
          } else {
            context.fillStyle = color;
          }
          return this;
        } else {
          return context.fillStyle;
        }
      },
      /**
      A getter / setter method to set the canvas strokeColor.

      <code><pre>
      # Set the stroke color
      canvas.strokeColor('#FF0000')

      # Passing no arguments returns the strokeColor
      canvas.strokeColor()
      # => '#FF0000'

      # You can also pass a Color object
      canvas.strokeColor(Color('sky blue'))
      </pre></code>

      @name strokeColor
      @methodOf PixieCanvas#

      @param {String|Color} [color] color to make the canvas strokeColor

      @returns {PixieCanvas} this
      */
      strokeColor: function(color) {
        if (color) {
          if (color.channels) {
            context.strokeStyle = color.toString();
          } else {
            context.strokeStyle = color;
          }
          return this;
        } else {
          return context.strokeStyle;
        }
      },
      /**
      Determine how wide some text is.

      <code><pre>
      canvas.measureText('Hello World!')
      # => 55
      </pre></code>

      @name measureText
      @methodOf PixieCanvas#

      @param {String} [text] the text to measure

      @returns {PixieCanvas} this
      */
      measureText: function(text) {
        return context.measureText(text).width;
      },
      putImageData: function(imageData, x, y) {
        context.putImageData(imageData, x, y);
        return this;
      },
      context: function() {
        return context;
      },
      element: function() {
        return canvas;
      },
      createPattern: function(image, repitition) {
        return context.createPattern(image, repitition);
      },
      clip: function(x, y, width, height) {
        context.beginPath();
        context.rect(x, y, width, height);
        context.clip();
        return this;
      }
    });
    contextAttrAccessor = function() {
      var attrs;
      attrs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return attrs.each(function(attr) {
        return $canvas[attr] = function(newVal) {
          if (newVal != null) {
            context[attr] = newVal;
            return this;
          } else {
            return context[attr];
          }
        };
      });
    };
    canvasAttrAccessor = function() {
      var attrs;
      attrs = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
      return attrs.each(function(attr) {
        return $canvas[attr] = function(newVal) {
          if (newVal != null) {
            canvas[attr] = newVal;
            return this;
          } else {
            return canvas[attr];
          }
        };
      });
    };
    contextAttrAccessor("font", "globalAlpha", "globalCompositeOperation", "lineWidth", "textAlign");
    canvasAttrAccessor("height", "width");
    if (canvas != null ? canvas.getContext : void 0) {
      context = canvas.getContext('2d');
      if (options.init) options.init($canvas);
      return $canvas;
    }
  };
})(jQuery);

/**
A browser polyfill so you can consistently
call requestAnimationFrame. Using
requestAnimationFrame is preferred to
setInterval for main game loops.

http://paulirish.com/2011/requestanimationframe-for-smart-animating/

@name requestAnimationFrame
@namespace
*/
window.requestAnimationFrame || (window.requestAnimationFrame = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
  return window.setTimeout(function() {
    return callback(+new Date());
  }, 1000 / 60);
});


(function($) {
  /**
  A simple interface for playing sounds in games.

  @name Sound
  @namespace
  */
  var Sound, directory, format, globalVolume, loadSoundChannel, sounds, _ref;
  directory = (typeof App !== "undefined" && App !== null ? (_ref = App.directories) != null ? _ref.sounds : void 0 : void 0) || "sounds";
  format = "wav";
  sounds = {};
  globalVolume = 1;
  loadSoundChannel = function(name) {
    var sound, url;
    url = "" + BASE_URL + "/" + directory + "/" + name + "." + format;
    return sound = $('<audio />', {
      autobuffer: true,
      preload: 'auto',
      src: url
    }).get(0);
  };
  Sound = function(id, maxChannels) {
    return {
      play: function() {
        return Sound.play(id, maxChannels);
      },
      stop: function() {
        return Sound.stop(id);
      }
    };
  };
  return Object.extend(Sound, {
    /**
    Set the global volume modifier for all sound effects.

    Any value set is clamped between 0 and 1. This is multiplied
    into each individual effect that plays.

    If no argument is given return the current global sound effect volume.

    @name globalVolume
    @methodOf Sound
    @param {Number} [newVolume] The volume to set
    */
    globalVolume: function(newVolume) {
      if (newVolume != null) globalVolume = newVolume.clamp(0, 1);
      return globalVolume;
    },
    /**
    Play a sound from your sounds
    directory with the name of `id`.

    <code><pre>
    # plays a sound called explode from your sounds directory
    Sound.play('explode')
    </pre></code>

    @name play
    @methodOf Sound

    @param {String} id id or name of the sound file to play
    @param {String} maxChannels max number of sounds able to be played simultaneously
    */
    play: function(id, maxChannels) {
      var channel, channels, freeChannels, sound;
      maxChannels || (maxChannels = 4);
      if (!sounds[id]) sounds[id] = [loadSoundChannel(id)];
      channels = sounds[id];
      freeChannels = $.grep(channels, function(sound) {
        return sound.currentTime === sound.duration || sound.currentTime === 0;
      });
      if (channel = freeChannels.first()) {
        try {
          channel.currentTime = 0;
        } catch (_error) {}
        channel.volume = globalVolume;
        return channel.play();
      } else {
        if (!maxChannels || channels.length < maxChannels) {
          sound = loadSoundChannel(id);
          channels.push(sound);
          sound.play();
          return sound.volume = globalVolume;
        }
      }
    },
    /**
    Play a sound from the given
    url with the name of `id`.

    <code><pre>
    # plays the sound at the specified url
    Sound.playFromUrl('http://YourSoundWebsite.com/explode.wav')
    </pre></code>

    @name playFromUrl
    @methodOf Sound

    @param {String} url location of sound file to play

    @returns {Sound} this sound object
    */
    playFromUrl: function(url) {
      var sound;
      sound = $('<audio />').get(0);
      sound.src = url;
      sound.play();
      sound.volume = globalVolume;
      return sound;
    },
    /**
    Stop a sound while it is playing.

    <code><pre>
    # stops the sound 'explode' from
    # playing if it is currently playing
    Sound.stop('explode')
    </pre></code>

    @name stop
    @methodOf Sound

    @param {String} id id or name of sound to stop playing.
    */
    stop: function(id) {
      var _ref2;
      return (_ref2 = sounds[id]) != null ? _ref2.stop() : void 0;
    }
  }, (typeof exports !== "undefined" && exports !== null ? exports : this)["Sound"] = Sound);
})(jQuery);


(function() {
  /**
  A wrapper on the Local Storage API

  @name Local
  @namespace
  */
  /**
  Store an object in local storage.

  <code><pre>
  # you can store strings
  Local.set('name', 'Matt')

  # and numbers
  Local.set('age', 26)

  # and even objects
  Local.set('person', {name: 'Matt', age: 26})
  </pre></code>

  @name set
  @methodOf Local

  @param {String} key string used to identify the object you are storing
  @param {Object} value value of the object you are storing

  @returns {Object} value
  */
  var retrieve, store;
  store = function(key, value) {
    localStorage[key] = JSON.stringify(value);
    return value;
  };
  /**
  Retrieve an object from local storage.

  <code><pre>
  Local.get('name')
  # => 'Matt'

  Local.get('age')
  # => 26

  Local.get('person')
  # => { age: 26, name: 'Matt' }
  </pre></code>

  @name get
  @methodOf Local

  @param {String} key string that identifies the stored object

  @returns {Object} The object that was stored or undefined if no object was stored.
  */
  retrieve = function(key) {
    var value;
    value = localStorage[key];
    if (value != null) return JSON.parse(value);
  };
  return (typeof exports !== "undefined" && exports !== null ? exports : this)["Local"] = {
    get: retrieve,
    set: store,
    put: store,
    /**
    Access an instance of Local with a specified prefix.

    @name new
    @methodOf Local

    @param {String} prefix
    @returns {Local} An interface to local storage with the given prefix applied.
    */
    "new": function(prefix) {
      prefix || (prefix = "");
      return {
        get: function(key) {
          return retrieve("" + prefix + "_" + key);
        },
        set: function(key, value) {
          return store("" + prefix + "_" + key, value);
        },
        put: function(key, value) {
          return store("" + prefix + "_" + key, value);
        }
      };
    }
  };
})();
