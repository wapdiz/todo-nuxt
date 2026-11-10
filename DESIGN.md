---
name: Список задач
description: Светлый личный список по выбранным датам с локальным хранением, фильтрацией и ИИ-помощником; этап 6.
colors:
  primary: "#16a34a"
  primary-hover: "#15803d"
  accent-soft: "#eaf7ef"
  danger: "#b42318"
  danger-soft: "#fef3f2"
  page: "#edf1ee"
  surface: "#fff"
  sidebar: "#f7f9f8"
  surface-soft: "#f7f8f9"
  text: "#1f2421"
  muted: "#68706a"
  line: "rgb(22 33 27 / 9%)"
  control-muted: "#f1f3f5"
  checkbox-line: "#68706a"
  icon-faint: "#b9bdc4"
typography:
  display:
    fontFamily: "Arial, sans-serif"
    fontSize: "calc(30 * var(--width-multiplier))"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Arial, sans-serif"
    fontSize: "calc(17 * var(--width-multiplier))"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Arial, sans-serif"
    fontSize: "calc(14 * var(--width-multiplier))"
    lineHeight: 1.55
  label:
    fontFamily: "Arial, sans-serif"
    fontSize: "calc(12 * var(--width-multiplier))"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  shell: "calc(28 * var(--width-multiplier))"
  panel: "calc(20 * var(--width-multiplier))"
  field: "calc(14 * var(--width-multiplier))"
  row: "calc(10 * var(--width-multiplier))"
  control: "calc(9 * var(--width-multiplier))"
  circle: "50%"
spacing:
  compact: "calc(8 * var(--width-multiplier))"
  control: "calc(12 * var(--width-multiplier))"
  section: "calc(24 * var(--width-multiplier))"
---

# Design System: Список задач

## Overview

Светлый интерфейс в трёхколоночной компоновке: календарь и обзор слева, задачи с мягкой мятной аурой шапки по центру, панель ИИ-помощника справа. Все заголовки, даты и элементы управления используют гротеск без засечек (`Arial, sans-serif`), основной акцент — зелёный `#16a34a`.

**Key Characteristics:**
- Белая рабочая область, слегка приглушённые боковые панели (`#f7f9f8`), тонкие полупрозрачные разделители и пастельный мятно-голубой градиент в верхней шапке и сфере приветствия ИИ.
- Единые CSS custom properties (`--todo-accent`, `--todo-accent-hover`, `--todo-accent-soft`, `--todo-line`, `--todo-text`, `--todo-muted`, `--todo-sidebar`) внутри `.todo-page`.
- Преломление liquid glass остаётся для следующего визуального этапа.

## Colors

- **Primary (`#16a34a` / `#15803d`):** знак приложения, выбранная дата в календаре, кнопка `+ Новая задача`, отметка выполнения задачи, кнопка отправки и подтверждения предложений ИИ.
- **Soft Accent (`#eaf7ef`):** выбранный фильтр «Вид», пузыри сообщений пользователя, подсветка drop-плейсхолдера при перетаскивании.
- **Neutral:** страница `#edf1ee`, боковые колонки `#f7f9f8`, карточки `#fff`, завершённые строки `#f7f8f9`.

## Typography

Гротеск `Arial, sans-serif` (`var(--todo-font)`) используется во всех зонах:
- Приветствие в шапке (`Доброе утро!` / `Добрый день!` / `Добрый вечер!` / `Доброй ночи!`): `vc(30)` bold, `vc(15)` на tablet, `vc(26)` на mobile.
- Заголовок секции списка: `vc(17)` semibold, `vc(10)` на tablet.
- Размеры задаются только через `vc()` и проектные миксины, без `min()`, `max()`, `clamp()`.

## Layout

- **Desktop (1280px+ portrait/landscape):** трёхколоночная сетка `vc(260) minmax(0, 1fr) vc(356)`, `max-width: vc(1408)`, `overflow: clip` на `.todo-shell` для работы `position: sticky` в боковой панели календаря и в колонке ИИ-чата, при сохранении прокрутки окна `window` для автоскролла DnD.
- **Tablet (portrait 768–1279.5px):** две колонки `vc(116) minmax(0, 1fr)`; ИИ-чат открывается выдвижной правой панелью по кнопке «ИИ-чат» в верхней панели.
- **Mobile (<768px):** одна колонка; кнопки «Календарь» и «ИИ-чат» открывают взаимоисключающие выдвижные слои с подложкой, закрытием по `Escape` и возвратом фокуса на кнопку-триггер.

## Components

- **Левая панель (`TaskSidebar` + `TaskCalendar`):** бренд, клиентский `TaskCalendar` с зелёным выделением выбранного дня, обзор личного списка и общий счётчик задач.
- **Центральная колонка:** пастельная верхняя аура, динамическое приветствие по локальному часу и выбранная дата, dropdown `TaskViewFilter` (`Вид`: `Все` / `Активные` / `Выполненные`), кнопка `Новая задача`, форма `TaskForm`, уведомление хранилища `TaskStorageNotice` и список `TaskList` с перетаскиванием (активным только в режиме `Все`).
- **Правая панель (`TaskAiChat` + `TaskAiProposalCard`):** карточка диалога с градиентной пастельной сферой на приветствии, дисклеймер приватности (`Сообщения и задачи выбранного дня отправляются в n8n и Gemini`), ввод сообщения (`Enter` отправляет кроме IME, `Shift+Enter` переносит строку) и две быстрые кнопки под карточкой («Задачи из текста» и «Разбить на шаги» с выбором задачи дня).
- **Карточки предложений (`add_tasks`, `split_task`):** отображают чекбоксы шагов, даты (включая `Сегодня` / `Завтра`) и бейдж контекстной даты при переключении дня во время или после ответа. Задачи добавляются в `localStorage` только после явного нажатия `Добавить`.
