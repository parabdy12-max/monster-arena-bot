extends SceneTree

func _initialize() -> void:
	call_deferred("_run")

func _run() -> void:
	var packed := load("res://scenes/main.tscn") as PackedScene
	if packed == null:
		push_error("Could not load main scene")
		quit(1)
		return
	var game := packed.instantiate()
	root.add_child(game)
	await process_frame
	for node_name in ["Player", "HUD"]:
		if game.get_node_or_null(node_name) == null:
			push_error("Missing required node: " + node_name)
			quit(1)
			return
	for action in ["move_left", "move_right", "jump", "dash", "interact"]:
		if not InputMap.has_action(action):
			push_error("Missing input action: " + action)
			quit(1)
			return
	print("Taj Siah smoke test passed.")
	quit(0)
