extends CanvasLayer

const BUTTON_SIZE := Vector2(76, 76)

func _ready() -> void:
	if not (OS.has_feature("mobile") or DisplayServer.is_touchscreen_available()):
		return
	var surface := Control.new()
	surface.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	surface.mouse_filter = Control.MOUSE_FILTER_PASS
	add_child(surface)
	_add_button(surface, "◀", "move_left", false, 20, -100)
	_add_button(surface, "▶", "move_right", false, 104, -100)
	_add_button(surface, "پرش", "jump", true, -100, -184)
	_add_button(surface, "دش", "dash", true, -100, -100)
	_add_button(surface, "تعامل", "interact", true, -184, -100)

func _add_button(parent: Control, caption: String, action: String, right_side: bool, x: float, y: float) -> void:
	var button := Button.new()
	button.text = caption
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = BUTTON_SIZE
	button.size = BUTTON_SIZE
	button.anchor_left = 1.0 if right_side else 0.0
	button.anchor_right = button.anchor_left
	button.anchor_top = 1.0
	button.anchor_bottom = 1.0
	button.offset_left = x
	button.offset_right = x + BUTTON_SIZE.x
	button.offset_top = y
	button.offset_bottom = y + BUTTON_SIZE.y
	button.button_down.connect(func() -> void: Input.action_press(action))
	button.button_up.connect(func() -> void: Input.action_release(action))
	parent.add_child(button)

func _exit_tree() -> void:
	for action in ["move_left", "move_right", "jump", "dash", "interact"]:
		Input.action_release(action)
