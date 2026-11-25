import { useEffect, useRef } from "react";
import { gsap } from "gsap";

// Rutas de las imágenes (cuadradas). Déjalas vacías hasta tener los archivos,
// luego pon aquí el src, por ejemplo: "/img/kay.png"
const IMAGES = {
  MadreEcuanime: "/img/sprites/madre_ecuanime/idle/MadreEcuanimeIdle_0001.png",
  Solstice: "/img/sprites/solstice/Idle/sols%20idle_0001.png",
  Kay: "/img/sprites/kay/Idle/kay_idle_0001.png",
  Osito: "/img/sprites/bear/Idle/BearPetIdle_0001.png",
};

const IMG_SIZE = 96; // px, tamaño fijo y cuadrado

/* ----------------------------- Datos de clases ---------------------------- */

const CHARACTER_BODY_2D = {
  name: "CharacterBody2D",
  stereotype: "Godot",
  dashed: true,
};
const BASE_FIGHT_ENTITY = {
  name: "BaseFightEntity",
  stereotype: "Godot",
  dashed: true,
};

const NEIGHBOORD_BASE = {
  name: "NeighboordBase",
  attrs: [
    "+ SPEED: float = 100.0",
    "+ JUMP_SPEED: float = -450.0",
    "+ MAX_LIFE: int = 5000",
    "+ MOVE_AREA_SIZE: Vector2",
    "+ MIN_MOVE_DISTANCE, MAX_MOVE_DISTANCE: float",
    "+ MIN_MOVE_TIME, MAX_MOVE_TIME: float",
    "+ MIN_IDLE_TIME, MAX_IDLE_TIME: float",
    "+ MIN_DISTANCE_TO_TARGET: float",
    "+ animatedSprite: AnimatedSprite2D",
    "+ neighbor_id: String",
    "+ interaction_radius: float",
    "+ bubble_offset: Vector2",
    "+ FIGHTS_PATH: String {readOnly}",
    "+ player: CharacterBody2D",
    "+ is_fight_scene: bool",
    "+ starting_position: Vector2",
    "+ move_area_min, move_area_max: Vector2",
    "+ movement_target: Vector2",
    "+ movement_timer: float",
    "+ is_moving: bool",
    "- _interactable: Interactable",
  ],
  methods: [
    "- _ready(): void",
    "+ get_player_direction(): int",
    "- _physics_process(delta: float): void",
    "- _enter_fight(): void",
    "- _physics_process_top_view(delta: float): void",
    "- _calculate_move_area(): void",
    "- _update_movement_animation_top_view(direction: Vector2): void",
    "- _update_idle_animation(): void",
    "- _start_moving(): void",
    "- _start_idle(): void",
    "- _choose_random_target(): void",
  ],
};

const NEIGHBORS = [
  { name: "MadreEcuanime" },
  { name: "Solstice" },
  { name: "Kay" },
];

const PET_BASE = {
  name: "PetBase",
  attrs: [
    "+ GROUP_FOLLOW: String",
    "+ MOVEMENT_DELAY: float = 1.0",
    "+ animatedSprite: AnimatedSprite2D",
    "+ IsInUse: bool",
    "+ JUMP_HEIGHT: float = 232.0",
    "+ RISE_TIME: float = 0.42",
    "+ FALL_MULTIPLIER: float = 1.6",
    "+ JUMP_CUT: float = 0.4",
    "+ MAX_FALL_SPEED: float = 720.0",
    "+ COYOTE_TIME: float = 0.1",
    "+ JUMP_BUFFER_TIME: float = 0.12",
    "+ INVULNERABLE_TIME: float = 1.0",
    "+ ATTACK_REACH: Vector2",
    "+ ATTACK_DURATION: float = 0.12",
    "+ ATTACK_COOLDOWN: float = 0.3",
    "+ ATTACK_MASK: int = 4",
    "+ KNOCKBACK: Vector2",
    "+ KNOCKBACK_TIME: float = 0.2",
    "+ FLASH_DURATION: float = 0.12",
    "+ HIT_PAUSE: float = 0.1",
    "+ target: CharacterBody2D",
    "+ movement_history: Array[Dictionary]",
    "+ elapsed_time: float",
    "+ time_factor: float = 1.0",
    "+ pull_velocity: Vector2",
    "- _invulnerable, _coyote, _jump_buffer: float",
    "- _attack_cooldown, _knockback: float",
    "- _facing: int",
    "- _hitbox: Area2D",
    "- _hitbox_shape: CollisionShape2D",
  ],
  methods: [
    "- _ready(): void",
    "- _physic_top_view_process(delta: float): void",
    "- _get_delayed_velocity(target_time: float): Vector2",
    "- _update_animation(movement_velocity: Vector2): void",
    "- _physic_fight_process(delta: float): void",
    "- _create_hitbox(): void",
    "- _update_combat(delta: float): void",
    "- _swing(): void",
    "+ receive_hit(attack: float, point: Vector2): void",
    "- _push_back(origin: Vector2): void",
    "+ slow_down(factor: float, seconds: float): void",
  ],
};

const OSITO = {
  name: "Osito",
  attrs: ["+ TEMPORARY_DATA: Dictionary {readOnly}"],
  methods: ["- _ready(): void"],
};

/* ------------------------------- Componentes ------------------------------ */

function ClassBox({ cls, boxRef }) {
  const { name, stereotype, attrs = [], methods = [], dashed } = cls;
  return (
    <div ref={boxRef} className={`uml-box${dashed ? " uml-box--ext" : ""}`}>
      <div className="uml-name">
        {stereotype && <small>«{stereotype}»</small>}
        <strong>{name}</strong>
      </div>
      {!dashed && (
        <>
          <ul className="uml-sec">
            {attrs.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <ul className="uml-sec">
            {methods.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ChildCard({ cls, reg }) {
  const src = IMAGES[cls.name] || undefined;

  const grow = (e) =>
    gsap.to(e.currentTarget.querySelector(".uml-img"), {
      scale: 1.06,
      rotate: -2,
      duration: 0.25,
      ease: "power2.out",
    });
  const shrink = (e) =>
    gsap.to(e.currentTarget.querySelector(".uml-img"), {
      scale: 1,
      rotate: 0,
      duration: 0.3,
      ease: "power2.out",
    });

  return (
    <div
      className="uml-node uml-child"
      onMouseEnter={grow}
      onMouseLeave={shrink}
    >
      <ClassBox cls={cls} boxRef={reg(cls.name)} />
      <img
        className="uml-img"
        src={src}
        alt={cls.name}
        width={IMG_SIZE}
        height={IMG_SIZE}
        style={{ width: IMG_SIZE, height: IMG_SIZE }}
      />
    </div>
  );
}

function UmlDiagram({ external, base, children }) {
  const wrap = useRef(null);
  const nodes = useRef({});
  const paths = useRef([]);
  const tris = useRef([]);

  const reg = (id) => (el) => {
    if (el) nodes.current[id] = el;
  };

  // [hijo, padre]; el primero es base -> clase externa de Godot
  const links = [
    [base.name, external.name],
    ...children.map((c) => [c.name, base.name]),
  ];

  useEffect(() => {
    const root = wrap.current;
    const ARROW = 14;

    const measure = () => {
      const c = root.getBoundingClientRect();
      links.forEach(([child, parent], i) => {
        const a = nodes.current[child]?.getBoundingClientRect();
        const b = nodes.current[parent]?.getBoundingClientRect();
        if (!a || !b || !paths.current[i]) return;
        const x1 = a.left + a.width / 2 - c.left;
        const y1 = a.top - c.top;
        const x2 = b.left + b.width / 2 - c.left;
        const y2 = b.bottom - c.top;
        const mid = y2 + ARROW + (y1 - y2 - ARROW) / 2;
        paths.current[i].setAttribute(
          "d",
          `M${x1} ${y1}V${mid}H${x2}V${y2 + ARROW}`,
        );
        tris.current[i].setAttribute(
          "points",
          `${x2},${y2} ${x2 - 8},${y2 + ARROW} ${x2 + 8},${y2 + ARROW}`,
        );
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let io;
    let ctx;

    if (!reduce) {
      ctx = gsap.context(() => {
        gsap.set(".uml-node", { autoAlpha: 0, y: 18 });
        gsap.set(".uml-line, .uml-tri", { autoAlpha: 0 });

        const draw = (tl, i, at) => {
          const p = paths.current[i];
          const len = p.getTotalLength();
          tl.fromTo(
            p,
            { strokeDasharray: len, strokeDashoffset: len, autoAlpha: 1 },
            {
              strokeDashoffset: 0,
              duration: 0.6,
              ease: "power1.inOut",
              clearProps: "strokeDasharray,strokeDashoffset",
            },
            at,
          ).fromTo(
            tris.current[i],
            { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 100%" },
            { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(2)" },
            ">-0.1",
          );
        };

        const run = () => {
          const tl = gsap.timeline({ defaults: { ease: "power2.out" } });
          tl.to(".uml-ext", { autoAlpha: 1, y: 0, duration: 0.45 }).to(
            ".uml-base",
            { autoAlpha: 1, y: 0, duration: 0.55 },
            "-=0.15",
          );
          draw(tl, 0, "<0.1");
          tl.to(
            ".uml-child",
            { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.15 },
            "-=0.2",
          );
          for (let i = 1; i < links.length; i++) draw(tl, i, "<0.15");
        };

        io = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              run();
              io.disconnect();
            }
          },
          { threshold: 0.15 },
        );
        io.observe(root);
      }, root);
    }

    return () => {
      ro.disconnect();
      io?.disconnect();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrap} className="uml-diagram">
      <svg className="uml-svg" aria-hidden="true">
        {links.map(([c, p], i) => (
          <g key={`${c}-${p}`}>
            <path className="uml-line" ref={(el) => (paths.current[i] = el)} />
            <polygon className="uml-tri" ref={(el) => (tris.current[i] = el)} />
          </g>
        ))}
      </svg>

      <div
        className="uml-node uml-ext"
        style={{ maxWidth: "15rem", width: "100%" }}
      >
        <ClassBox cls={external} boxRef={reg(external.name)} />
      </div>

      <div
        className="uml-node uml-base"
        style={{ maxWidth: "40rem", width: "100%" }}
      >
        <ClassBox cls={base} boxRef={reg(base.name)} />
      </div>

      <div className="uml-children">
        {children.map((c) => (
          <ChildCard key={c.name} cls={c} reg={reg} />
        ))}
      </div>
    </div>
  );
}

export default function UmlClases() {
  return (
    <div className="uml">
      <style>{css}</style>
      <UmlDiagram
        external={CHARACTER_BODY_2D}
        base={NEIGHBOORD_BASE}
        children={NEIGHBORS}
      />
      <UmlDiagram
        external={BASE_FIGHT_ENTITY}
        base={PET_BASE}
        children={[OSITO]}
      />
    </div>
  );
}

/* --------------------------------- Estilos -------------------------------- */

const css = `
.uml {
  --uml-accent: #d9822b;
  --uml-stroke: color-mix(in srgb, currentColor 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 5rem;
  font-size: 0.8rem;
}
.uml-diagram {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rem;
}
.uml-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}
.uml-line {
  fill: none;
  stroke: var(--uml-accent);
  stroke-width: 1.6;
}
.uml-tri {
  fill: none;
  stroke: var(--uml-accent);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.uml-node { position: relative; z-index: 1; }
.uml-box {
  width: 100%;
  border: 1.5px solid var(--uml-stroke);
  border-radius: 6px;
  overflow: hidden;
  background: color-mix(in srgb, currentColor 4%, transparent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.uml-box--ext { border-style: dashed; }
.uml-name {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  background: color-mix(in srgb, var(--uml-accent) 18%, transparent);
}
.uml-name small { font-size: 0.7rem; opacity: 0.7; }
.uml-sec {
  list-style: none;
  margin: 0;
  padding: 0.45rem 0.75rem;
  min-height: 1.7rem;
  border-top: 1.5px solid var(--uml-stroke);
  font-size: 0.72rem;
  line-height: 1.55;
}
.uml-sec li { overflow-wrap: anywhere; }
.uml-children {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}
.uml-child {
  flex: 1 1 15rem;
  max-width: 22rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.uml-child .uml-box { flex: 1; min-width: 0; }
.uml-img {
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 6px;
  border: 1.5px dashed var(--uml-stroke);
  background: color-mix(in srgb, currentColor 6%, transparent);
  font-size: 0.65rem;
  overflow: hidden;
}
`;
