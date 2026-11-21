extends Node2D

const PLAYER_SCRIPT = preload("res://scripts/player_controller.gd")
var player: CharacterBody2D
var npc_position := Vector2(820, 560)
var hint: Label
var dialogue: Label
var dialogue_open := false

func _ready() -> void:
	_build_platform(Rect2(0, 600, 2800, 140))
	_build_platform(Rect2(1100, 490, 240, 24))
	_build_platform(Rect2(1510, 420, 200, 24))
	_build_player()
	_build_npc()
	_build_hud()

func _draw() -> void:
	draw_rect(Rect2(0, 0, 2800, 720), Color("#090e19"))
	draw_circle(Vector2(1040, 145), 52, Color("#aab7d0"))
	draw_circle(Vector2(1060, 130), 52, Color("#090e19"))
	for i in range(18):
		var x := 30.0 + float(i) * 158.0
		var h := 100.0 + float((i * 43) % 140)
		draw_rect(Rect2(x, 500.0 - h, 112, h), Color("#141e30"))

func _process(_delta: float) -> void:
	if player == null:
		return
	var near := player.global_position.distance_to(npc_position) < 145.0
	if not dialogue_open:
		hint.visible = near
		if near and Input.is_action_just_pressed("interact"):
			dialogue_open = true
			dialogue.text = "برف: اینجا نمونهٔ اولیهٔ تاج سیاه است. حرکت و تعامل را آزمایش می‌کنیم. برای بستن، E را بزن."
			dialogue.visible = true
	elif Input.is_action_just_pressed("interact"):
		dialogue_open = false
		dialogue.visible = false

func _build_platform(rect: Rect2) -> void:
	var body := StaticBody2D.new()
	body.position = rect.position + rect.size / 2.0
	body.collision_layer = 1
	var shape := RectangleShape2D.new()
	shape.size = rect.size
	var collision := CollisionShape2D.new()
	collision.shape = shape
	body.add_child(collision)
	add_child(body)
	var visual := Polygon2D.new()
	visual.polygon = PackedVector2Array([Vector2.ZERO, Vector2(rect.size.x, 0), rect.size, Vector2(0, rect.size.y)])
	visual.position = rect.position
	visual.color = Color("#273247")
	add_child(visual)

func _build_player() -> void:
	player = CharacterBody2D.new()
	player.name = "Player"
	player.position = Vector2(600, 600)
	player.set_script(PLAYER_SCRIPT)
	var shape := CapsuleShape2D.new()
	shape.radius = 14
	shape.height = 62
	var collision := CollisionShape2D.new()
	collision.position.y = -31
	collision.shape = shape
	player.add_child(collision)
	var sprite := Polygon2D.new()
	sprite.polygon = PackedVector2Array([Vector2(-14,-60), Vector2(14,-60), Vector2(18,-6), Vector2(-18,-6)])
	sprite.color = Color("#aeb8ca")
	player.add_child(sprite)
	var camera := Camera2D.new()
	camera.position = Vector2(0, -250)
	camera.position_smoothing_enabled = true
	player.add_child(camera)
	add_child(player)

func _build_npc() -> void:
	var npc := Polygon2D.new()
	npc.name = "NPC"
	npc.polygon = PackedVector2Array([Vector2(-18,-58), Vector2(18,-58), Vector2(24,-8), Vector2(-24,-8)])
	npc.position = npc_position
	npc.color = Color("#596477")
	add_child(npc)
	var name_tag := Label.new()
	name_tag.text = "برف"
	name_tag.position = npc_position + Vector2(-18, -100)
	add_child(name_tag)

func _build_hud() -> void:
	var layer := CanvasLayer.new()
	layer.name = "HUD"
	add_child(layer)
	var title := Label.new()
	title.text = "تاج سیاه: فساد"
	title.position = Vector2(24, 18)
	title.add_theme_font_size_override("font_size", 26)
	layer.add_child(title)
	hint = Label.new()
	hint.text = "E / تعامل"
	hint.position = Vector2(500, 510)
	hint.visible = false
	layer.add_child(hint)
	dialogue = Label.new()
	dialogue.position = Vector2(230, 500)
	dialogue.size = Vector2(820, 120)
	dialogue.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	dialogue.visible = false
	dialogue.add_theme_font_size_override("font_size", 22)
	layer.add_child(dialogue)
