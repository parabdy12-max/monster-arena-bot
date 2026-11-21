extends CharacterBody2D
class_name PlayerController

@export var move_speed: float = 280.0
@export var jump_velocity: float = -500.0
@export var dash_speed: float = 700.0
@export var dash_duration: float = 0.16
@export var dash_cooldown: float = 0.7

var gravity: float = float(ProjectSettings.get_setting("physics/2d/default_gravity"))
var facing: float = 1.0
var dash_left: float = 0.0
var cooldown_left: float = 0.0

func _physics_process(delta: float) -> void:
	cooldown_left = maxf(0.0, cooldown_left - delta)
	var direction := Input.get_axis("move_left", "move_right")
	if not is_zero_approx(direction):
		facing = signf(direction)
	if Input.is_action_just_pressed("jump") and is_on_floor() and dash_left <= 0.0:
		velocity.y = jump_velocity
	if Input.is_action_just_pressed("dash") and cooldown_left <= 0.0:
		dash_left = dash_duration
		cooldown_left = dash_cooldown
	if dash_left > 0.0:
		dash_left = maxf(0.0, dash_left - delta)
		velocity.x = facing * dash_speed
		velocity.y = 0.0
	else:
		velocity.x = direction * move_speed
		if not is_on_floor():
			velocity.y += gravity * delta
	move_and_slide()
