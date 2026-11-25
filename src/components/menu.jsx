import { useEffect, useRef, useState } from "react";
import { Application, Assets, AnimatedSprite } from "pixi.js";
import gsap from "gsap";

function Menu() {
  const [isActive, setActive] = useState(false);
  const [isSelected, setSelected] = useState(null);

  const imagesSection = useRef(null);
  const pixiCanvas = useRef(null);
  const imagesRefs = useRef({});

  const invertSelected = () => {
    setActive((prev) => !prev);
  };

  // Imágenes asociadas a cada apartado
  const menuItems = [
    {
      id: "contexto",
      label: "Contexto del Proyecto",
      image: "/img/backgrounds/madre_ecuanime.png",
    },
    {
      id: "modelado",
      label: "Modelado de Clases",
      image: "/img/backgrounds/modelado.png",
    },
    {
      id: "codificación",
      label: "Codificación del Modelo",
      image: "/img/backgrounds/code.png",
    },
    {
      id: "interfaz",
      label: "Interfaz Gráfica",
      image: "/img/backgrounds/interfaz.png",
    },
    {
      id: "persistencia",
      label: "Conexión y Manejo de la Persistencia",
      image: "/img/backgrounds/icons.png",
    },
  ];

  // Inicialización de PixiJS
  useEffect(() => {
    let app;
    let cancelled = false;

    async function initPixy() {
      try {
        app = new Application();

        const styles = getComputedStyle(document.documentElement);
        const secondary = styles.getPropertyValue("--color-accent-800").trim();

        await app.init({
          width: 800,
          height: 800,
          background: secondary,
          antialias: false,
        });

        if (cancelled) {
          app.destroy({ removeView: true });
          return;
        }

        const container = imagesSection.current;

        if (!container) {
          throw new Error("No se encontró el contenedor #images");
        }

        container.appendChild(app.canvas);
        pixiCanvas.current = app.canvas;

        app.canvas.classList.add("rounded-full", "absolute");
        app.canvas.style.transition = "opacity 300ms ease";
        app.canvas.style.imageRendering = "pixelated";

        const textures = await Promise.all([
          Assets.load("/img/sprites/roxxane_flint/flint_0001.png"),
          Assets.load("/img/sprites/roxxane_flint/flint_0002.png"),
          Assets.load("/img/sprites/roxxane_flint/flint_0003.png"),
          Assets.load("/img/sprites/roxxane_flint/flint_0004.png"),
        ]);

        if (cancelled) {
          app.destroy({ removeView: true });
          return;
        }

        textures.forEach((texture) => {
          texture.source.scaleMode = "nearest";
        });

        const idle = new AnimatedSprite(textures);

        idle.anchor.set(0.5);
        idle.x = app.screen.width / 2;
        idle.y = app.screen.height / 2;
        idle.scale.set(15);
        idle.animationSpeed = 0.05;
        idle.loop = true;
        idle.play();

        app.stage.addChild(idle);
      } catch (error) {
        if (!cancelled) {
          console.error("Error inicializando PixiJS:", error);
        }
      }
    }

    initPixy();

    return () => {
      cancelled = true;
      pixiCanvas.current = null;
      app?.destroy({ removeView: true });
    };
  }, []);

  // Animación de las imágenes con GSAP
  useEffect(() => {
    const container = imagesSection.current;
    if (!container) return;

    const ctx = gsap.context(() => {
      const images = Object.values(imagesRefs.current);

      // Ocultar todas las imágenes
      gsap.to(images, {
        opacity: 0,
        duration: 0.4,
      });

      // Mostrar Pixi cuando no hay selección
      if (pixiCanvas.current) {
        gsap.to(pixiCanvas.current, {
          opacity: isSelected === null ? 1 : 0,
          duration: 0.4,
          ease: "power2.out",
        });
      }

      if (isSelected === null) return;

      const selectedImage = imagesRefs.current[isSelected];
      if (!selectedImage) return;

      gsap.killTweensOf(selectedImage);

      const animateImage = () => {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const imageWidth =
          (selectedImage.naturalWidth / selectedImage.naturalHeight) *
          containerHeight;

        const overflow = Math.max(0, imageWidth - containerWidth);

        gsap.to(selectedImage, {
          x: -overflow,
          duration: 5,
          ease: "none",
          repeat: -1,
          yoyo: true,
        });
      };

      if (selectedImage.complete && selectedImage.naturalWidth > 0) {
        animateImage();
      } else {
        selectedImage.onload = animateImage;
      }
    }, container);

    return () => {
      ctx.revert();
    };
  }, [isSelected]);

  return (
    <>
      {/* HAMBURGUESA */}
      <div
        className="absolute top-6 right-6 cursor-pointer flex flex-col justify-center gap-2 w-6 aspect-square z-[100]"
        onClick={invertSelected}
      >
        <div
          className={`w-full h-1 bg-accent-200 transition-all duration-500 ease-in-out ${
            isActive ? "rotate-45 translate-y-[6px]" : "rotate-0 translate-y-0"
          }`}
        />

        <div
          className={`w-full h-1 bg-accent-200 transition-all duration-500 ease-in-out ${
            isActive
              ? "-rotate-45 -translate-y-[6px]"
              : "rotate-0 translate-y-0"
          }`}
        />
      </div>

      {/* MENÚ */}
      <section className="absolute w-screen h-screen z-50 flex overflow-hidden pointer-events-none">
        {/* PANEL IZQUIERDO */}
        <div
          className={`w-2/5 h-screen flex flex-col justify-center items-center absolute bg-primary-700 transition-transform duration-700 ease-in-out pointer-events-auto ${
            isActive ? "translate-x-0" : "-translate-x-full"
          }`}
          style={{ viewTransitionName: "navbar" }}
        >
          <ul className="flex flex-col gap-6">
            {menuItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`/${item.id}`}
                  onMouseEnter={() => setSelected(item.id)}
                  onMouseLeave={() => setSelected(null)}
                >
                  <span className="hover:text-secondary-300 transition-colors duration-300">
                    {item.label}
                  </span>
                </a>
              </li>
            ))}
            <li>
              <a
                className="hover:text-secondary-300 transition-colors duration-300"
                href="/"
              >
                <span>Jugar</span>
              </a>
            </li>
          </ul>
        </div>

        {/* PANEL DERECHO */}
        <div
          className={`w-3/5 h-screen bg-primary-700 absolute flex flex-col justify-center items-center transition-transform duration-700 ease-in-out pointer-events-auto ${
            isActive ? "translate-x-0" : "translate-x-full"
          } overflow-hidden`}
          ref={imagesSection}
          style={{ right: 0, viewTransitionName: "images" }}
        >
          {/* IMÁGENES */}
          {menuItems.map((item) => (
            <img
              key={item.id}
              ref={(el) => {
                if (el) imagesRefs.current[item.id] = el;
                else delete imagesRefs.current[item.id];
              }}
              src={item.image}
              alt={item.label}
              className={`absolute top-0 left-0 h-full w-auto max-w-none object-cover transition-opacity delay-75 ${isSelected == item.id ? "opacity-100" : "opacity-0"}`}
            />
          ))}
        </div>
      </section>
    </>
  );
}

export default Menu;
