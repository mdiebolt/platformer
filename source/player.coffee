Player = (I = {}) ->
  SPEED = 0.9
  GRAVITY = 4
  JUMP_POWER = 12

  # a lower value makes jumps float more
  FLOAT_FACTOR = 0.3

  Object.reverseMerge I,
    acceleration: Point(0, GRAVITY)
    color: "red"
    velocity: Point(0, 0)
    rotation: 0
    rotationalVelocity: Math.TAU / 32
    zIndex: 5

  jumping = false
  falling = true
  landed = false
  airborne = true

  facing = 'right'

  self = GameObject(I).extend
    collide: (xOffset, yOffset, className) ->
      engine.find(className).inject false, (hit, block) ->
        hit || Collision.rectangular(self.bounds(xOffset, yOffset), block.bounds())

  self.include Debuggable

  self.debug
    filter: 'changed'

  self.bind 'update', ->
    if self.collide(0, I.velocity.y.sign(), "Spike")
      self.destroy()

    if jumping
      if facing is 'left'
        I.rotation += -I.rotationalVelocity
      else
        I.rotation += I.rotationalVelocity

    acc = I.acceleration.y
    float_acc = I.acceleration.y * FLOAT_FACTOR

    if keydown.left
      I.velocity.x -= SPEED
      facing = 'left'
    else if keydown.right
      I.velocity.x += SPEED
      facing = 'right'
    else
      I.velocity.x = I.velocity.x.approach(0, SPEED * 2)

    if jumping
      # make it feel more 'floaty' by reducing the effect of gravity while jumping
      I.velocity.y += float_acc
    else if falling
      I.velocity.y += acc

    if justPressed.z && landed && !airborne
      jumping = true
      landed = false
      I.velocity.y = -JUMP_POWER

    jumping = false unless keydown.z

    I.velocity.x.abs().times ->
      if self.collide(I.velocity.x.sign(), 0, "Wall")
        I.velocity.x = 0
      else
        I.x += I.velocity.x.sign()

    if I.velocity.y.abs() > 0
      airborne = true

    I.velocity.y.abs().times ->
      if self.collide(0, I.velocity.y.sign(), "Wall")
        falling = false

        if I.velocity.y > 0
          I.rotation = 0
          landed = true
          airborne = false
          jumping = false

        I.velocity.y = 0
      else
        falling = true
        I.y += I.velocity.y.sign()

    I.velocity.x = I.velocity.x.clamp(-12, 12)
    I.velocity.y = I.velocity.y.clamp(-10, 10)

    I.x = I.x.clamp(I.width / 2, App.width - I.width / 2)

  self
