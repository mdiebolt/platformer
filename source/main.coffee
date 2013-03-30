App = {}

App.width = 800
App.height = 640

loadMap = (mapData, engine) ->
  tileWidth = mapData.tilewidth
  tileHeight = mapData.tileheight

  halfTileWidth = tileWidth / 2
  halfTileHeight = tileHeight / 2

  mapWidth = mapData.width
  mapHeight = mapData.height

  classMap = {}

  mapData.tilesets.each (tileset) ->
    for k, v of tileset.tileproperties
      if className = v.class
        classMap[tileset.firstgid] =
          class: className
          width: tileset.tilewidth
          height: tileset.tileheight

  mapData.layers.each (layer, zIndex) ->
    row = 0
    column = 0

    layer.data.each (cell, index) ->
      if tile = classMap[cell]
        entityHalfWidth = tile.width / 2
        entityHalfHeight = tile.height / 2

        engine.add
          class: tile.class
          x: (column * tileWidth) + entityHalfWidth
          y: (row * tileHeight) + entityHalfHeight
          width: tile.width
          height: tile.height
          zIndex: zIndex

      # if we are at the end of the
      # row advance to the next one
      if column is mapWidth - 1
        row += 1
        column = 0
      else
        column += 1

engine = Engine
  backgroundColor: Color("pink")
  canvas: $("canvas#game").pixieCanvas()

loadMap(Data.level2, engine)

$ ->
  engine.start()
