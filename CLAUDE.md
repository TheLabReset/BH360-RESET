# CLAUDE.md — Instrucciones para Claude Code

## Qué es este proyecto

BH360 (Brand Health 360) es un indice compuesto de salud de marca (0-100) desarrollado por The Lab / Reset. Aplicacion React que calcula, visualiza y simula el indice. Lee `README.md` para la documentacion completa.

## Archivos que importan (lee en este orden)

1. `README.md` — Arquitectura, formula, sistema de diseno, convenciones, como modificar
2. `src/lib/bh360.ts` — Motor de calculo: interfaces, constantes, dimensiones, pesos, goalposts, formula
3. `src/App.tsx` — UI completa: 4 vistas (Reporte, Ingreso, Simulador, Metodologia)
4. `src/index.css` — Tema dark: CSS variables de shadcn/ui

## Archivos que NO debes editar

- `src/components/ui/*` — Componentes shadcn/ui generados. No editar manualmente.
- `bundle.html` — Compilado final. Se regenera, no se lee ni edita.
- `dist/` — Output intermedio de Parcel.
- `node_modules/` — Dependencias.

## Comandos

```bash
pnpm install          # Instalar dependencias
pnpm dev              # Dev server en http://localhost:5173
pnpm build            # Build de produccion (output en dist/)
npx tsc --noEmit      # Type check sin compilar
```

## Reglas de codigo

- TypeScript estricto, React funcional con hooks
- Variables y funciones en camelCase ingles
- Labels y textos de UI en espanol con buena ortografia (con tildes y signos correctos)
- NUNCA emojis. Solo Lucide icons
- NUNCA Inter/Roboto/Arial. Tipografia: Outfit (Google Fonts)
- Graficos siempre via Recharts (no SVG manual para charts)
- Dark mode unico (sin toggle light/dark en v1)
- Los pesos de las 5 dimensiones DEBEN sumar 1.0
- Sentiment es NSS (-100 a +100), NO porcentaje positivo
- Montos en soles peruanos (S/)

## Estructura rapida

```
src/
  lib/bh360.ts       ← Motor de calculo (interfaces, formula, datos ejemplo)
  App.tsx             ← UI completa (4 vistas en un archivo)
  index.css           ← Tema dark (CSS variables)
  components/ui/      ← shadcn/ui (no tocar)
```

## Para agregar una dimension

1. Agregar objeto en array `DIMENSIONS` en `bh360.ts`
2. Agregar campo en interfaces `PeriodData` y `NormalizedScores`
3. Actualizar `calculateBH360()` para normalizar y ponderar
4. Agregar icono en `DimIcon` en `App.tsx`
5. Agregar paso en stepper de `DataEntryView`
6. Rebalancear weights (deben sumar 1.0)

## Para cambiar pesos

1. Editar `weight` en cada elemento de `DIMENSIONS` en `bh360.ts`
2. Verificar que sumen 1.0
3. Actualizar `justification` y formula textual en `MethodView`
