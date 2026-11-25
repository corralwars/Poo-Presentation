import { memo, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

const CODE_NEIGHBOORD = `class_name NeighboordBase extends CharacterBody2D


@export var SPEED: float = 100.0
@export var JUMP_SPEED: float = -450.0
@export var MAX_LIFE: int = 5000


@export_category("Top View Movement")
@export var MOVE_AREA_SIZE: Vector2 = Vector2(300, 200)

@export var MIN_MOVE_DISTANCE: float = 50.0
@export var MAX_MOVE_DISTANCE: float = 150.0

@export var MIN_MOVE_TIME: float = 1.0
@export var MAX_MOVE_TIME: float = 2.5

@export var MIN_IDLE_TIME: float = 1.0
@export var MAX_IDLE_TIME: float = 3.0

@export var MIN_DISTANCE_TO_TARGET: float = 5.0
@export_category("References")
@export var animatedSprite: AnimatedSprite2D

@export_category("Interaction")
@export var neighbor_id := ""
@export var interaction_radius := 70.0
@export var bubble_offset := Vector2(0, -25)

const FIGHTS_PATH := "res://scenes/locations/fights/"

var _interactable: Interactable


var player: CharacterBody2D

var is_fight_scene: bool = false
var starting_position: Vector2

var move_area_min: Vector2
var move_area_max: Vector2

var movement_target: Vector2

var movement_timer: float = 0.0

var is_moving: bool = false


func _ready() -> void:

	player = get_tree().get_first_node_in_group("Player")
	var current_scene_path := get_tree().current_scene.scene_file_path
	is_fight_scene = false
	starting_position = position
	_calculate_move_area()
	if not neighbor_id.is_empty():
		_interactable = Interactable.new()
		_interactable.position = bubble_offset
		_interactable.radius = interaction_radius
		_interactable.interacted.connect(_enter_fight)
		add_child(_interactable)


func get_player_direction() -> int:
	if player == null:
		return 0

	if player.global_position.x > global_position.x:
		return 1

	if player.global_position.x < global_position.x:
		return -1
	return 0


func _physics_process(delta: float) -> void:
	if player == null:
		return

	_physics_process_top_view(delta)


func _enter_fight() -> void:
	_interactable.enabled = false
	var response: Dictionary = await Neighbors.getNeighboorById(neighbor_id)
	if not response.success:
		push_error("Neighbor %s could not be loaded" % neighbor_id)
		_interactable.enabled = true
		return
	Player.return_position = player.global_position
	get_tree().change_scene_to_file(FIGHTS_PATH + response.data.combatScene)


func _physics_process_top_view(delta: float) -> void:
	movement_timer -= delta
	if not is_moving:
		velocity = Vector2.ZERO
		move_and_slide()
		_update_idle_animation()
		if movement_timer <= 0.0:
			_start_moving()
		return

	var direction := position.direction_to(movement_target)
	velocity = direction * SPEED
	move_and_slide()
	_update_movement_animation_top_view(direction)

	if position.distance_to(movement_target) <= MIN_DISTANCE_TO_TARGET:
		_start_idle()
		return

	if movement_timer <= 0.0:
		_start_idle()

func _calculate_move_area() -> void:
	move_area_min = starting_position - (MOVE_AREA_SIZE / 2.0)
	move_area_max = starting_position + (MOVE_AREA_SIZE / 2.0)

func _update_movement_animation_top_view(direction: Vector2) -> void:
	if animatedSprite == null:
		return
	if abs(direction.x) > abs(direction.y):
		animatedSprite.play("Walk_Front")
		animatedSprite.flip_h = direction.x < 0.0
	else:
		if direction.y < 0.0:
			animatedSprite.play("Walk_Up")
		else:
			animatedSprite.play("Walk_Down")

func _update_idle_animation() -> void:
	if animatedSprite == null:
		return
	if player == null:
		return

	animatedSprite.play("Idle")
	animatedSprite.flip_h = get_player_direction() < 0

func _start_moving() -> void:
	is_moving = true
	_choose_random_target()

	movement_timer = randf_range(
		MIN_MOVE_TIME,
		MAX_MOVE_TIME
	)

func _start_idle() -> void:

	is_moving = false
	velocity = Vector2.ZERO

	movement_timer = randf_range(
		MIN_IDLE_TIME,
		MAX_IDLE_TIME
	)

func _choose_random_target() -> void:
	var angle := randf_range(
		0.0,
		TAU
	)

	var distance := randf_range(
		MIN_MOVE_DISTANCE,
		MAX_MOVE_DISTANCE
	)

	var offset := Vector2(
		cos(angle),
		sin(angle)
	) * distance

	movement_target = position + offset

	movement_target.x = clamp(
		movement_target.x,
		move_area_min.x,
		move_area_max.x
	)

	movement_target.y = clamp(
		movement_target.y,
		move_area_min.y,
		move_area_max.y
	)
`;

const CODE_PET = `class_name PetBase extends BaseFightEntity

@export_category("Target")
@export var GROUP_FOLLOW: String = ""

@export_category("Movement Delay")
@export var MOVEMENT_DELAY: float = 1.0

@export_category("References")
@export var animatedSprite: AnimatedSprite2D
@export var IsInUse:bool

@export_category("Jump")
@export var JUMP_HEIGHT := 232.0
@export var RISE_TIME := 0.42
@export var FALL_MULTIPLIER := 1.6
@export var JUMP_CUT := 0.4
@export var MAX_FALL_SPEED := 720.0
@export var COYOTE_TIME := 0.1
@export var JUMP_BUFFER_TIME := 0.12

@export_category("Combat")
@export var INVULNERABLE_TIME := 1.0
@export var ATTACK_REACH := Vector2(30, 26)
@export var ATTACK_DURATION := 0.12
@export var ATTACK_COOLDOWN := 0.3
@export_flags_2d_physics var ATTACK_MASK := 4
@export var KNOCKBACK := Vector2(240.0, -200.0)
@export var KNOCKBACK_TIME := 0.2
@export var FLASH_DURATION := 0.12
@export var HIT_PAUSE := 0.1

var target: CharacterBody2D = null
var movement_history: Array[Dictionary] = []
var elapsed_time: float = 0.0
var time_factor := 1.0
var pull_velocity := Vector2.ZERO

var _invulnerable := 0.0
var _coyote := 0.0
var _jump_buffer := 0.0
var _attack_cooldown := 0.0
var _facing := 1
var _hitbox: Area2D
var _hitbox_shape: CollisionShape2D
var _knockback := 0.0


func _ready() -> void:
	super()
	target = get_tree().get_first_node_in_group(GROUP_FOLLOW) as CharacterBody2D
	if is_fight_scene:
		_create_hitbox()
		setup_flash(animatedSprite)


func _physic_top_view_process(delta: float) -> void:
	if target == null:
		return

	elapsed_time += delta
	movement_history.append({
		"time": elapsed_time,
		"velocity": target.velocity
	})

	var delayed_time: float = elapsed_time - MOVEMENT_DELAY
	if delayed_time <= 0.0:
		velocity = Vector2.ZERO
		move_and_slide()
		_update_animation(velocity)
		return

	var delayed_velocity: Vector2 = _get_delayed_velocity(delayed_time)
	velocity = delayed_velocity

	move_and_slide()
	_update_animation(velocity)


func _get_delayed_velocity(target_time: float) -> Vector2:
	while movement_history.size() > 1 and float(movement_history[1]["time"]) <= target_time:
		movement_history.pop_front()

	var oldest_entry: Dictionary = movement_history[0]

	if float(oldest_entry["time"]) > target_time:
		return Vector2.ZERO

	return oldest_entry["velocity"] as Vector2

func _update_animation(movement_velocity: Vector2) -> void:
	if animatedSprite == null:
		return

	if movement_velocity.is_zero_approx():
		animatedSprite.play("Idle")
		return

	if abs(movement_velocity.x) > abs(movement_velocity.y):
		animatedSprite.play("Walk_Front")
		animatedSprite.flip_h = movement_velocity.x < 0.0
		return

	if movement_velocity.y < 0.0:
		animatedSprite.play("Walk_Up")
		return

	if movement_velocity.y > 0.0:
		animatedSprite.play("Walk_Down")
		return


func _physic_fight_process(delta: float) -> void:
	if time_factor <= 0.0 or health <= 0.0:
		return
	delta *= time_factor
	_update_combat(delta)
	var speed: float = stats.velocity
	var gravity := 2.0 * JUMP_HEIGHT / (RISE_TIME * RISE_TIME)
	var jump_impulse := -2.0 * JUMP_HEIGHT / RISE_TIME

	_coyote = COYOTE_TIME if is_on_floor() else maxf(_coyote - delta, 0.0)
	_jump_buffer = JUMP_BUFFER_TIME if Input.is_action_just_pressed("ui_up") else maxf(_jump_buffer - delta, 0.0)

	if not is_on_floor():
		var g := gravity * (FALL_MULTIPLIER if velocity.y > 0.0 else 1.0)
		velocity.y = minf(velocity.y + g * delta, MAX_FALL_SPEED)

	if _jump_buffer > 0.0 and _coyote > 0.0:
		velocity.y = jump_impulse
		_jump_buffer = 0.0
		_coyote = 0.0

	if Input.is_action_just_released("ui_up") and velocity.y < 0.0:
		velocity.y *= JUMP_CUT

	var direction := Input.get_axis("ui_left", "ui_right")

	if _knockback > 0.0:
		_knockback -= delta
		velocity.x = move_toward(velocity.x, 0.0, speed * 4.0 * delta)
	elif direction:
		velocity.x = direction * speed
		_facing = 1 if direction > 0 else -1
		animatedSprite.flip_h = direction < 0
	else:
		velocity.x = move_toward(velocity.x, 0, speed)

	velocity *= time_factor
	move_and_slide()
	velocity /= time_factor
	move_and_collide(pull_velocity * delta)
	pull_velocity = Vector2.ZERO

	if not is_on_floor():
		animatedSprite.play("Jump")
	elif direction != 0:
		animatedSprite.play("Walk_Front")
	else:
		animatedSprite.play("Idle")


func _create_hitbox() -> void:
	_hitbox = Area2D.new()
	_hitbox.collision_layer = 0
	_hitbox.collision_mask = ATTACK_MASK
	_hitbox.monitoring = false
	_hitbox_shape = CollisionShape2D.new()
	var r := RectangleShape2D.new()
	r.size = ATTACK_REACH
	_hitbox_shape.shape = r
	_hitbox.add_child(_hitbox_shape)
	add_child(_hitbox)


func _update_combat(delta: float) -> void:
	_attack_cooldown = maxf(_attack_cooldown - delta, 0.0)
	if _invulnerable > 0.0:
		_invulnerable -= delta
		var elapsed := INVULNERABLE_TIME - _invulnerable
		animatedSprite.visible = _invulnerable <= 0.0 or elapsed < FLASH_DURATION + 0.05 or int(_invulnerable * 12.0) % 2 == 0
	if Input.is_action_just_pressed("atacar") and _attack_cooldown <= 0.0:
		_swing()


func _swing() -> void:
	_attack_cooldown = ATTACK_COOLDOWN
	_hitbox_shape.position = Vector2(_facing * (ATTACK_REACH.x / 2.0 + 4.0), -6.0)
	var swipe := SwipeEffect.new()
	swipe.position = _hitbox_shape.position
	swipe.scale.x = _facing
	add_child(swipe)
	_hitbox.monitoring = true
	await get_tree().physics_frame
	await get_tree().physics_frame
	var hit := {}
	for area in _hitbox.get_overlapping_areas():
		var enemy := area.get_parent()
		if enemy is BaseFightEntity and not hit.has(enemy):
			hit[enemy] = true
			enemy.receive_hit(stats.attack, _hitbox_shape.global_position)
	await get_tree().create_timer(ATTACK_DURATION, false).timeout
	_hitbox.monitoring = false


func receive_hit(attack: float, point := Vector2.INF) -> void:
	if _invulnerable > 0.0 or health <= 0.0:
		return
	super(attack, point)
	_invulnerable = INVULNERABLE_TIME
	get_tree().call_group("fight_camera", "shake", 3.0, 0.25)
	flash_white(FLASH_DURATION)
	_push_back(point)
	hit_stop(HIT_PAUSE)


func _push_back(origin: Vector2) -> void:
	if time_factor <= 0.0:
		return
	var side := -_facing
	if origin.is_finite() and not is_equal_approx(origin.x, global_position.x):
		side = 1 if global_position.x > origin.x else -1
	velocity = Vector2(side * KNOCKBACK.x, KNOCKBACK.y)
	_knockback = KNOCKBACK_TIME


func slow_down(factor: float, seconds: float) -> void:
	time_factor = factor
	animatedSprite.speed_scale = factor
	if factor <= 0.0:
		velocity = Vector2.ZERO
	await get_tree().create_timer(seconds, false).timeout
	time_factor = 1.0
	animatedSprite.speed_scale = 1.0
`;

const CODE_OSITO = `extends PetBase

const TEMPORARY_DATA := {
	"name": "Osito",
	"stats": { "health": 3000, "attack": 200, "defense": 100, "velocity": 300, "stamina": 100, "specialChance": 0.2 },
	"specialAttacks": []
}


func _ready() -> void:
	super()
	if is_fight_scene and id.is_empty():
		apply_data(TEMPORARY_DATA)
`;

const FILES = [
  {
    file: "neighboord_base.gd",
    lang: "gd",
    label: "GDScript",
    title: "Clase base de los vecinos",
    image: "/img/backgrounds/madre_ecuanime.png",
    code: CODE_NEIGHBOORD,
  },
  {
    file: "pet_base.gd",
    lang: "gd",
    label: "GDScript",
    title: "Clase base de las mascotas",
    image: "/img/backgrounds/model.png",
    code: CODE_PET,
  },
  {
    file: "osito.gd",
    lang: "gd",
    label: "GDScript",
    title: "Mascota Osito",
    image: "/img/backgrounds/code.png",
    code: CODE_OSITO,
  },
];

const CPS = 320; // caracteres por segundo al "escribir"
const FRAMES = [1, 2, 3, 4].map(
  (n) => `/img/sprites/roxxane_flint/flint_000${n}.png`,
);

/* ------------------------------ Resaltado --------------------------------- */
// <tokenizer>
const GD_KW = new Set(
  "class_name extends var const func if elif else for while return not and or in is as await super null true false pass match break continue signal enum static void self".split(
    " ",
  ),
);
const JS_KW = new Set(
  "import from export default function const let var return if else new await async try catch throw null true false undefined typeof for of in while switch case break continue".split(
    " ",
  ),
);
const LANGS = {
  gd: {
    kw: GD_KW,
    comment: /#[^\n]*/y,
    annot: /@\w+/y,
    template: false,
    jsx: false,
  },
  jsx: {
    kw: JS_KW,
    comment: /\/\/[^\n]*|\/\*[\s\S]*?\*\//y,
    annot: null,
    template: true,
    jsx: true,
  },
};
const STR = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/y;
const NUM = /\d+(?:\.\d+)?/y;
const IDENT = /[A-Za-z_$][\w$]*/y;
const WS = /\s+/y;

function tokenize(code, lang) {
  const L = LANGS[lang];
  const out = [];
  const n = code.length;
  const stack = [];
  let i = 0;
  let prev = "";
  const add = (t, s) => {
    out.push([t, s]);
    if (t !== "ws") prev = s;
  };
  const m = (re) => {
    re.lastIndex = i;
    const r = re.exec(code);
    return r ? r[0] : null;
  };

  while (i < n) {
    const top = stack[stack.length - 1];

    // Dentro de un template literal (texto)
    if (top && top.t === "tpl") {
      if (code[i] === "`") {
        add("str", "`");
        i++;
        stack.pop();
        continue;
      }
      if (code.startsWith("${", i)) {
        add("punc", "${");
        i += 2;
        stack.push({ t: "interp", d: 0 });
        continue;
      }
      let j = i;
      while (j < n && code[j] !== "`" && !code.startsWith("${", j)) j++;
      add("str", code.slice(i, j));
      i = j;
      continue;
    }

    let s;
    if ((s = m(WS))) {
      add("ws", s);
      i += s.length;
      continue;
    }
    if ((s = m(L.comment))) {
      add("com", s);
      i += s.length;
      continue;
    }
    if ((s = m(STR))) {
      add("str", s);
      i += s.length;
      continue;
    }
    if (L.template && code[i] === "`") {
      add("str", "`");
      i++;
      stack.push({ t: "tpl" });
      continue;
    }
    if (L.annot && (s = m(L.annot))) {
      add("ann", s);
      i += s.length;
      continue;
    }
    if ((s = m(IDENT))) {
      const next = code[i + s.length];
      let t = "id";
      if (L.kw.has(s)) t = "kw";
      else if (/^[A-Z][A-Z0-9_]+$/.test(s)) t = "const";
      else if (/^[A-Z]/.test(s)) t = "type";
      else if (next === "(") t = "fn";
      else if (L.jsx && (prev === "<" || prev === "/") && /^[a-z]/.test(s))
        t = "tag";
      else if (
        L.jsx &&
        next === "=" &&
        code[i + s.length + 1] !== "=" &&
        /^[a-z]/.test(s)
      )
        t = "attr";
      add(t, s);
      i += s.length;
      continue;
    }
    if ((s = m(NUM))) {
      add("num", s);
      i += s.length;
      continue;
    }

    const c = code[i];
    if (top && top.t === "interp") {
      if (c === "{") top.d++;
      else if (c === "}") {
        if (top.d === 0) {
          add("punc", "}");
          i++;
          stack.pop();
          continue;
        }
        top.d--;
      }
    }
    add("punc", c);
    i++;
  }
  return out;
}

function toLines(tokens) {
  const lines = [[]];
  for (const [t, s] of tokens) {
    s.split("\n").forEach((part, k) => {
      if (k > 0) lines.push([]);
      if (part) lines[lines.length - 1].push([t, part]);
    });
  }
  return lines;
}
// </tokenizer>

/* ------------------------------ Componentes ------------------------------- */

const Line = memo(function Line({ n, tokens, shown, cursor }) {
  let left = shown < 0 ? Infinity : shown;
  const parts = [];
  for (let k = 0; k < tokens.length && left > 0; k++) {
    const [t, s] = tokens[k];
    const txt = s.length <= left ? s : s.slice(0, left);
    left -= txt.length;
    parts.push(
      <span key={k} className={`t-${t}`}>
        {txt}
      </span>,
    );
  }
  return (
    <div className="ct-line">
      <span className="ct-ln">{n}</span>
      <code>
        {parts}
        {cursor && <i className="ct-cursor" />}
      </code>
    </div>
  );
});

function Sprite({ active }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!active) {
      setF(0);
      return;
    }
    const id = setInterval(() => setF((x) => (x + 1) % FRAMES.length), 180);
    return () => clearInterval(id);
  }, [active]);
  return (
    <img className="ct-sprite" src={FRAMES[f]} alt="" width={44} height={44} />
  );
}

function Terminal({ file, lang, label, title, image, code }) {
  const root = useRef(null);
  const body = useRef(null);
  const tween = useRef(null);
  const stick = useRef(true);
  const [typed, setTyped] = useState(0);
  const [status, setStatus] = useState("idle"); // idle | typing | done

  const { lines, starts, total } = useMemo(() => {
    const lines = toLines(
      tokenize(code.replace(/[ \t]+$/gm, "").trimEnd(), lang),
    );
    const starts = [];
    let acc = 0;
    for (const l of lines) {
      starts.push(acc);
      acc += l.reduce((a, [, s]) => a + s.length, 0) + 1;
    }
    return { lines, starts, total: acc - 1 };
  }, [code, lang]);

  const play = () => {
    tween.current?.kill();
    stick.current = true;
    const o = { n: 0 };
    setTyped(0);
    setStatus("typing");
    tween.current = gsap.to(o, {
      n: total,
      duration: total / CPS,
      ease: "none",
      onUpdate: () => setTyped(Math.floor(o.n)),
      onComplete: () => {
        setTyped(total);
        setStatus("done");
      },
    });
  };

  const skip = () => {
    tween.current?.kill();
    setTyped(total);
    setStatus("done");
  };

  // Empieza a escribir cuando el terminal entra en pantalla
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(total);
      setStatus("done");
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(root.current);
    return () => {
      io.disconnect();
      tween.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sigue la escritura hacia abajo, salvo que la persona suba el scroll
  useEffect(() => {
    const el = body.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [typed]);

  const onScroll = () => {
    const el = body.current;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  };

  let cur = 0;
  while (cur + 1 < starts.length && starts[cur + 1] <= typed) cur++;

  return (
    <figure ref={root} className="ct">
      <header className="ct-head" style={{ backgroundImage: `url(${image})` }}>
        <div className="ct-shade" />
        <div className="ct-headrow">
          <Sprite active={status === "typing"} />
          <div className="ct-meta">
            <strong>{file}</strong>
            <span>{title}</span>
          </div>
          <span className="ct-lang">{label}</span>
          <button
            type="button"
            className="ct-btn"
            onClick={status === "typing" ? skip : play}
          >
            {status === "typing"
              ? "Saltar"
              : status === "done"
                ? "Repetir"
                : "Escribir"}
          </button>
        </div>
      </header>

      <div
        ref={body}
        className="ct-body"
        onScroll={onScroll}
        tabIndex={0}
        aria-label={`Código de ${file}`}
      >
        {lines.slice(0, cur + 1).map((tk, li) => (
          <Line
            key={li}
            n={li + 1}
            tokens={tk}
            shown={li < cur ? -1 : typed - starts[li]}
            cursor={li === cur}
          />
        ))}
      </div>
    </figure>
  );
}

export default function CodigoTerminales() {
  return (
    <div className="ct-wrap">
      <style>{css}</style>
      {FILES.map((f) => (
        <Terminal key={f.file} {...f} />
      ))}
    </div>
  );
}

/* -------------------------------- Estilos --------------------------------- */

const css = `
.ct-wrap {
  --t-kw: var(--color-secondary-300, #e8a35b);
  --t-fn: var(--color-accent-200, #f2d58a);
  --t-str: color-mix(in srgb, var(--t-fn) 55%, #93d58f);
  --t-type: color-mix(in srgb, var(--t-kw) 45%, #7cc4ff);
  --t-num: color-mix(in srgb, var(--t-kw) 55%, #ff8f8f);
  --t-ann: color-mix(in srgb, var(--t-kw) 50%, var(--t-fn));
  --t-com: color-mix(in srgb, currentColor 45%, transparent);
  --ct-bg: color-mix(in srgb, var(--color-accent-800, #2a241c) 55%, #000);
  --ct-line: color-mix(in srgb, var(--t-fn) 28%, transparent);
  display: flex;
  flex-direction: column;
  gap: 3rem;
  width: 100%;
  max-width: 60rem;
  margin-inline: auto;
}
.ct {
  margin: 0;
  overflow: hidden;
  border-radius: 10px;
  border: 1.5px solid var(--ct-line);
  background: var(--ct-bg);
}
.ct-head {
  position: relative;
  display: flex;
  align-items: flex-end;
  min-height: 5.5rem;
  background-size: cover;
  background-position: center;
  border-bottom: 1.5px solid var(--ct-line);
}
.ct-shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--ct-bg) 92%, transparent), color-mix(in srgb, var(--ct-bg) 20%, transparent)),
    linear-gradient(to top, color-mix(in srgb, var(--ct-bg) 60%, transparent), transparent 70%);
}
.ct-headrow {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  width: 100%;
  padding: 0.9rem 1rem;
}
.ct-sprite {
  flex: none;
  width: 44px;
  height: 44px;
  image-rendering: pixelated;
}
.ct-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin-right: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.ct-meta strong { font-size: 0.95rem; color: var(--t-fn); }
.ct-meta strong::before { content: "$ "; color: var(--t-kw); }
.ct-meta span { font-size: 0.75rem; opacity: 0.75; }
.ct-lang {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--ct-line);
  background: color-mix(in srgb, var(--ct-bg) 70%, transparent);
}
.ct-btn {
  cursor: pointer;
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.72rem;
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
  color: var(--t-kw);
  background: color-mix(in srgb, var(--ct-bg) 70%, transparent);
  border: 1px solid color-mix(in srgb, var(--t-kw) 55%, transparent);
  transition: background-color 0.2s;
}
.ct-btn:hover { background: color-mix(in srgb, var(--t-kw) 18%, var(--ct-bg)); }
.ct-btn:focus-visible, .ct-body:focus-visible { outline: 2px solid var(--t-fn); outline-offset: 2px; }
.ct-body {
  max-height: 30rem;
  overflow: auto;
  padding: 0.75rem 0 1rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8rem;
  line-height: 1.65;
  tab-size: 4;
  scrollbar-color: var(--ct-line) transparent;
}
.ct-line {
  display: flex;
  gap: 1rem;
  width: max-content;
  min-width: 100%;
  min-height: 1.65em;
  padding-right: 1rem;
}
.ct-ln {
  flex: none;
  width: 3rem;
  text-align: right;
  opacity: 0.3;
  user-select: none;
}
.ct-line code { white-space: pre; font: inherit; }
.ct-cursor {
  display: inline-block;
  width: 0.55em;
  height: 1.1em;
  margin-left: 1px;
  vertical-align: text-bottom;
  background: var(--t-fn);
  animation: ct-blink 1s steps(1) infinite;
}
@keyframes ct-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .ct-cursor { animation: none; } }
.t-kw { color: var(--t-kw); }
.t-fn { color: var(--t-fn); }
.t-str { color: var(--t-str); }
.t-type { color: var(--t-type); }
.t-num, .t-const { color: var(--t-num); }
.t-ann { color: var(--t-ann); }
.t-tag { color: var(--t-kw); }
.t-attr { color: var(--t-type); }
.t-com { color: var(--t-com); font-style: italic; }
.t-punc { opacity: 0.7; }
@media (max-width: 40rem) {
  .ct-lang { display: none; }
}
`;
