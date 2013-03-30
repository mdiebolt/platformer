Wall = (I = {}) ->
  Object.reverseMerge I,
    solid: true
    sprite: "wall"

  self = GameObject(I)
