# BH360 — Metodologia Tecnica (DOCUMENTO INTERNO)

> **CONFIDENCIAL — Solo para uso del equipo Reset / The Lab.**
> Este documento NO debe compartirse con clientes ni exponerse en el frontend.

---

## Tabla de contenidos

- [Arquitectura del indice](#arquitectura-del-indice)
- [Las 5 dimensiones](#las-5-dimensiones)
- [Formula de calculo](#formula-de-calculo)
- [Escala interpretativa](#escala-interpretativa)
- [Calibracion de goalposts](#calibracion-de-goalposts)
- [Sustento metodologico](#sustento-metodologico)
- [Analisis de sensibilidad](#analisis-de-sensibilidad)
- [Referencias academicas](#referencias-academicas)

---

## Arquitectura del indice

### Los 3 pilares (alineados a ISO 20671)

| Pilar | Peso total | Dimensiones que contiene |
|-------|-----------|--------------------------|
| Input | 35% | Inversion (15%) + Alcance (20%) |
| Equity | 40% | Compra Declarada (25%) + Sentiment (15%) |
| Performance | 25% | Ventas (25%) |

---

## Las 5 dimensiones

| ID | Dimension | Peso | Piso | Techo | Unidad | Fuente |
|----|-----------|------|------|-------|--------|--------|
| `investment` | Inversion de Campana | 0.15 | 0 | 500,000 | S/ | Agencia de medios |
| `reach` | Alcance Deduplicado | 0.20 | 0 | 95 | % | Agencia + plataformas |
| `purchase` | Compra Declarada (Ultimo Mes) | 0.25 | 0 | 85 | % | Ipsos / Panel digital The Lab |
| `sentiment` | Net Sentiment Score | 0.15 | -100 | +100 | NSS | Agencia creativa / Social listening |
| `sales` | Ventas del Periodo | 0.25 | 0 | 12,000,000 | S/ | Cliente (ERP) |

### Justificaciones por dimension

- **Inversion (15%)**: Binet & Davis (IPA, 2025): el presupuesto explica el 89% de las variaciones en beneficio. Es el input mas controlable por la marca.
- **Alcance (20%)**: Sharp (2010): mental availability es el driver principal de crecimiento. El reach es su proxy mas directo y medible.
- **Compra Declarada (25%)**: Brand Finance BrandBeta (2022): familiaridad (65%) + consideracion (35%) explican 80%+ de varianza en market share. Compra declarada es la metrica de equity mas predictiva.
- **Sentiment (15%)**: Field (IPA, 2026): 93% de campanas con grandes mejoras en trust reportan efectos de negocio. Peso moderado (15%) porque es volatil y sensible a crisis.
- **Ventas (25%)**: Es el resultado final de negocio. Peso igual al de Compra Declarada (25%) para balancear equity con performance real.

---

## Formula de calculo

### Paso 1 — Normalizacion Min-Max con goalposting

```
N_i = min(100, max(0, (x_i - Piso_i) / (Techo_i - Piso_i) * 100))
```

Excepcion para Sentiment (rango natural -100 a +100):
```
N_sentiment = ((NSS + 100) / 200) * 100
```

### Paso 2 — Agregacion lineal ponderada

```
BH360 = 0.15 * N_inv + 0.20 * N_alc + 0.25 * N_com + 0.15 * N_sen + 0.25 * N_ven
```

### Calculo de pillar scores

Los pillar scores son el promedio ponderado de las dimensiones normalizadas dentro de cada pilar:

```
inputAvg = (N_inv * 0.15 + N_alc * 0.20) / (0.15 + 0.20)
equityAvg = (N_com * 0.25 + N_sen * 0.15) / (0.25 + 0.15)
performanceAvg = N_ven
```

---

## Escala interpretativa

| Rango | Nivel | Variable `level` | Color |
|-------|-------|-------------------|-------|
| 0-30 | Critica | `critical` | `#ef4444` |
| 31-50 | Debil | `weak` | `#f97316` |
| 51-70 | Moderada | `moderate` | `#eab308` |
| 71-85 | Fuerte | `strong` | `#22c55e` |
| 86-100 | Excepcional | `exceptional` | `#06b6d4` |

---

## Calibracion de goalposts

Los goalposts (pisos y techos) estan calibrados para el contexto de San Fernando S.A.:
- ~S/ 0.2-0.5M de inversion por campana en medios (techo 500K)
- Lider en proteina animal en Peru (FMCG)
- ~S/ 10-12M de ventas trimestrales

La inversion se ingresa desagregada por medio (TV Abierta, Digital, OOH, Radio, Periodico) y su suma alimenta la dimension `investment`. El desglose se persiste en el campo opcional `mediaMix` de `PeriodData` pero NO altera la formula: solo aporta el total. Estructura tipica del split por defecto (`DEFAULT_MEDIA_SHARES`): TV Abierta 45%, Digital 30%, OOH 12%, Radio 9%, Periodico 4%.

Para otros clientes/categorias, ajustar `floor` y `ceiling` en el array `DIMENSIONS` de `bh360.ts`.

---

## Sustento metodologico

| Fuente | Hallazgo clave | Impacto en BH360 |
|--------|---------------|-------------------|
| Binet & Davis (IPA, 2025) | El presupuesto explica el 89% de las variaciones en beneficio | Peso significativo para pilar Input (35%) |
| Binet & Field (IPA, 2013) | ESOV predice market share growth; 60/40 brand/activation | Peso de Alcance como puente entre inversion y resultados |
| Brand Finance BrandBeta (2022) | Familiaridad (65%) + consideracion (35%) = 80%+ de varianza en market share | Compra Declarada como metrica de equity mas predictiva (25%) |
| IPA Databank (1600+ casos) | Numero total de metricas que mejoran predice exito mejor que cualquier metrica individual | Justificacion del indice compuesto como "metrica de metricas" |
| Field (IPA, 2026) | 93% de campanas con grandes mejoras en trust reportan efectos de negocio | Inclusion de Sentiment como dimension; peso moderado (15%) |
| Sharp (2010) | Mental availability + physical availability = drivers de crecimiento | Alcance como proxy de mental availability |
| OCDE/JRC (2008) | Handbook on Constructing Composite Indicators | Normalizacion Min-Max, goalposting, analisis de sensibilidad |
| ISO 20671 (2019) | Brand evaluation: inputs + stakeholder equity + performance | Estructura tripartita del BH360 |
| Profit Ability 2 (Ebiquity/Thinkbox, 2024) | TV + BVOD genera 54.7% del beneficio total con ROI de 5.61 | Importancia de canales de amplio alcance |
| Saisana et al. (2005) | Uncertainty + sensitivity analysis para indices compuestos | Protocolo Monte Carlo para validar robustez de pesos |

---

## Analisis de sensibilidad

Siguiendo las recomendaciones de la OCDE/JRC (2008), el protocolo de validacion consiste en:

1. Generar 1,000 vectores de pesos aleatorios (distribucion Dirichlet)
2. Recalcular el BH360 para cada vector
3. Calcular la correlacion de Spearman entre rankings
4. Si la correlacion media es mayor a 0.90, los pesos son robustos

Este analisis esta planificado para la version 2.0 con datos historicos reales.

---

## Referencias academicas

- Binet, L. & Davis, S. (2025). *The Cost of Chaos*. IPA.
- Binet, L. & Field, P. (2013). *The Long and the Short of It*. IPA.
- Brand Finance (2022). *BrandBeta: Predicting Market Share from Brand Perceptions*.
- Field, P. (2026). *The Trust Effect*. IPA Databank.
- OECD/JRC (2008). *Handbook on Constructing Composite Indicators*.
- ISO 20671:2019. *Brand Evaluation — Principles and Fundamentals*.
- Sharp, B. (2010). *How Brands Grow*. Oxford University Press.
- Ebiquity/Thinkbox (2024). *Profit Ability 2*.
- Saisana, M. et al. (2005). *Uncertainty and Sensitivity Analysis for Composite Indicators*. JRC.

---

## Para modificar

### Cambiar pesos
1. Editar `weight` en cada elemento de `DIMENSIONS` en `bh360.ts`
2. Los pesos DEBEN sumar 1.0
3. Actualizar este documento

### Cambiar goalposts
1. Editar `floor` y/o `ceiling` en cada dimension en `bh360.ts`
2. Ajustar por categoria/cliente

### Agregar una nueva dimension
1. Agregar objeto en array `DIMENSIONS` en `bh360.ts`
2. Agregar campo en interfaces `PeriodData` y `NormalizedScores`
3. Actualizar `calculateBH360()` para normalizar y ponderar
4. Agregar icono en `DimIcon` en `App.tsx`
5. Agregar paso en stepper de `DataEntryView`
6. Rebalancear weights (deben sumar 1.0)
