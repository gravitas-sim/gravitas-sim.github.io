// =============================================================================
// The Settings panel: the grid of controls, the search box, the help text that
// arrives on the first press of an info button, the tooltip every info button
// shares and the individual black hole masses dialog.
// -----------------------------------------------------------------------------
// Extracted from js/ui.js (Prompt 107, slice 3) without a change of behavior. It
// never imports ui.js back. It fetches the dialog machinery on first use, as
// ui.js does. The panel's two staged values, localSettings and
// pendingCourseLevel, live here and are reached from ui.js's Apply and Reset
// handlers through the accessors below.
// =============================================================================

import { solarHTML } from './utils.js';
import { SCENARIO_INFO } from './data/scenarioInfo.js';
import { t, hasMessage, getLocale, registerMessages } from './i18n/index.js';
import { EN } from './i18n/en.js';
import { scenarioTitle, scenarioSummary } from './i18n/scenario.js';
import { announce } from './notify.js';
import {
  MOTION_MODES,
  motionPreference,
  setMotionPreference,
} from './quality.js';
import { setPlaying } from './controls.js';
import {
  COURSE_LEVELS,
  SETTING_SECTIONS,
  courseLevelDefaults,
  getCourseLevel,
  helpId,
  itemsOf,
  sectionLabelId,
} from './settingsSchema.js';
import { SETTINGS, DEFAULT_SETTINGS } from './appState.js';

/** The staged copy of SETTINGS the panel edits; Apply copies it back. */
let localSettings = {};
/** The course level the panel has staged, applied with everything else. */
let pendingCourseLevel = null;

/**
 * The dialog machinery, fetched the first time a dialog is opened. The import
 * is cached by the module system, so this and ui.js's own loader are one fetch.
 */
let dialogModule = null;
const dialog = async () => (dialogModule ??= await import('./dialog.js'));

/** @param {Object} next - Staged settings that replace the panel's copy */
const setLocalSettings = next => {
  localSettings = next;
};
const getPendingCourseLevel = () => pendingCourseLevel;

/**
 * The label an option menu shows for one of its values.
 *
 * The scenario preset list is the exception: its values are scenario keys, and
 * those already have titles in the catalog under their own ids, so it defers
 * to those rather than carrying a second copy. Everything else looks up
 * `settings.option.<key>.<value>` and falls back to the raw value, which is
 * always English and always readable.
 *
 * @param {string} key - The setting's key
 * @param {string} value - The stored option value
 * @returns {string} A label for a reader
 */
const settingOptionLabel = (key, value) => {
  const camel = key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  const slug = String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const id = `settings.option.${camel}.${slug}`;
  return hasMessage(id) || EN[id] ? t(id) : value;
};

// ===== Reusable Tooltip System =====
class TooltipManager {
  constructor() {
    this.activeTooltip = null;
    this.tooltipElement = null;
    this.init();
  }

  init() {
    // Create tooltip element
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'tooltip-system';
    this.tooltipElement.style.cssText = `
      position: fixed;
      background: rgba(34, 34, 34, 0.9);
      color: #e0e0e0;
      padding: 16px 20px;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(0, 170, 255, 0.2);
      z-index: 10000;
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
      max-width: 280px;
      word-wrap: break-word;
      white-space: normal;
      font-family: 'Inter', sans-serif;
    `;

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close';
    closeButton.title = t('tip.dismiss');
    closeButton.setAttribute('aria-label', t('tip.dismiss'));
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#e0e0e0';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#888';
      closeButton.style.background = 'none';
    });

    closeButton.addEventListener('click', e => {
      e.stopPropagation();
      this.hide();
    });

    // Add arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    `;

    this.tooltipElement.appendChild(closeButton);
    this.tooltipElement.appendChild(arrow);

    document.body.appendChild(this.tooltipElement);

    // Add event listeners
    document.addEventListener('click', this.handleOutsideClick.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    window.addEventListener('resize', this.handleResize.bind(this));
    window.addEventListener('scroll', this.handleScroll.bind(this));
  }

  show(tooltipText, triggerElement, options = {}) {
    // Hide any existing tooltip
    this.hide();

    // Create content container
    const contentContainer = document.createElement('div');
    contentContainer.style.cssText = `
      padding-right: 30px;
      margin-top: 8px;
    `;
    contentContainer.textContent = tooltipText;

    // Clear existing content and add new content
    this.tooltipElement.innerHTML = '';

    // Re-add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'tooltip-close';
    closeButton.title = t('tip.dismiss');
    closeButton.setAttribute('aria-label', t('tip.dismiss'));
    closeButton.innerHTML = '×';
    closeButton.style.cssText = `
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #888;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      transition: all 0.2s ease;
      line-height: 1;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.color = '#e0e0e0';
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.color = '#888';
      closeButton.style.background = 'none';
    });

    closeButton.addEventListener('click', e => {
      e.stopPropagation();
      this.hide();
    });

    // Add arrow
    const arrow = document.createElement('div');
    arrow.className = 'tooltip-arrow';
    arrow.style.cssText = `
      position: absolute;
      width: 0;
      height: 0;
      border: 6px solid transparent;
    `;

    this.tooltipElement.appendChild(closeButton);
    this.tooltipElement.appendChild(contentContainer);
    this.tooltipElement.appendChild(arrow);

    // Position tooltip
    this.positionTooltip(triggerElement, options);

    // Show tooltip
    this.tooltipElement.style.visibility = 'visible';
    this.tooltipElement.style.opacity = '1';
    this.tooltipElement.style.pointerEvents = 'auto';

    // Store reference
    this.activeTooltip = {
      element: triggerElement,
      options,
    };
  }

  hide() {
    if (this.tooltipElement) {
      this.tooltipElement.style.visibility = 'hidden';
      this.tooltipElement.style.opacity = '0';
      this.tooltipElement.style.pointerEvents = 'none';
    }
    this.activeTooltip = null;
  }

  positionTooltip(triggerElement, options = {}) {
    const tooltip = this.tooltipElement;
    const triggerRect = triggerElement.getBoundingClientRect();
    const arrow = tooltip.querySelector('.tooltip-arrow');

    // Default position (below the trigger)
    let position = options.position || 'bottom';
    let x = triggerRect.left + triggerRect.width / 2;
    let y = triggerRect.bottom + 8;

    // Calculate available space
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = tooltip.offsetWidth || 280;
    const tooltipHeight = tooltip.offsetHeight || 100;

    // Auto-position if not enough space
    if (position === 'bottom' && y + tooltipHeight > viewportHeight - 20) {
      position = 'top';
    }
    if (position === 'top' && y - tooltipHeight < 20) {
      position = 'bottom';
    }
    if (position === 'right' && x + tooltipWidth > viewportWidth - 20) {
      position = 'left';
    }
    if (position === 'left' && x - tooltipWidth < 20) {
      position = 'right';
    }

    // Adjust position based on final position
    switch (position) {
      case 'top':
        y = triggerRect.top - tooltipHeight - 8;
        x = triggerRect.left + triggerRect.width / 2;
        arrow.style.bottom = '-12px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderTopColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderBottomColor = 'transparent';
        break;
      case 'bottom':
        y = triggerRect.bottom + 8;
        x = triggerRect.left + triggerRect.width / 2;
        arrow.style.top = '-12px';
        arrow.style.left = '50%';
        arrow.style.transform = 'translateX(-50%)';
        arrow.style.borderBottomColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderTopColor = 'transparent';
        break;
      case 'left':
        x = triggerRect.left - tooltipWidth - 8;
        y = triggerRect.top + triggerRect.height / 2;
        arrow.style.right = '-12px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderLeftColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderRightColor = 'transparent';
        break;
      case 'right':
        x = triggerRect.right + 8;
        y = triggerRect.top + triggerRect.height / 2;
        arrow.style.left = '-12px';
        arrow.style.top = '50%';
        arrow.style.transform = 'translateY(-50%)';
        arrow.style.borderRightColor = 'rgba(34, 34, 34, 0.9)';
        arrow.style.borderLeftColor = 'transparent';
        break;
    }

    // Ensure tooltip stays within viewport bounds
    x = Math.max(10, Math.min(x, viewportWidth - tooltipWidth - 10));
    y = Math.max(10, Math.min(y, viewportHeight - tooltipHeight - 10));

    // Apply position
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  }

  handleOutsideClick(event) {
    if (
      this.activeTooltip &&
      !this.activeTooltip.element.contains(event.target) &&
      !this.tooltipElement.contains(event.target)
    ) {
      this.hide();
    }
  }

  handleKeydown(event) {
    if (event.key === 'Escape' && this.activeTooltip) {
      this.hide();
    }
  }

  handleResize() {
    if (this.activeTooltip) {
      this.positionTooltip(
        this.activeTooltip.element,
        this.activeTooltip.options
      );
    }
  }

  handleScroll() {
    if (this.activeTooltip) {
      this.positionTooltip(
        this.activeTooltip.element,
        this.activeTooltip.options
      );
    }
  }
}

// Create global tooltip manager instance
const tooltipManager = new TooltipManager();

// Function to get tooltip text for settings
/** The Settings help, by language, once fetched. */
const settingsHelpCache = {};
/** The languages whose Settings help has been registered with the catalog. */
const settingsHelpLoaded = new Set();
const helpLocale = () => (getLocale() === 'es' ? 'es' : 'en');

/**
 * Fetch the Settings help for the reader's language, once.
 *
 * Its own pair of files rather than the deferred catalogs: those are fetched in
 * both languages on every lesson route, for the lesson panel, and the help is
 * read by nobody there. English is the only fallback a string needs.
 * @returns {Promise<Object<string, string>>}
 */
const fetchSettingsHelp = async () => {
  const locale = helpLocale();
  settingsHelpCache[locale] ??=
    locale === 'es'
      ? (await import('./i18n/es.settingsHelp.js')).ES_SETTINGSHELP
      : (await import('./i18n/en.settingsHelp.js')).EN_SETTINGSHELP;
  return settingsHelpCache[locale];
};

/**
 * Register the Settings help with the catalog, which repaints everything that
 * shows text - this panel included. Only on an info button's press, which
 * copes with being rebuilt under it; never while the panel is opening, where a
 * rebuild takes the focus the dialog has just placed.
 */
const loadSettingsHelp = async () => {
  const locale = helpLocale();
  if (settingsHelpLoaded.has(locale)) return;
  registerMessages(locale, await fetchSettingsHelp());
  settingsHelpLoaded.add(locale);
};

/** What a course level sets, in words, if they have arrived. */
const levelHintText = level => {
  const id = `settings.level.${level}.hint`;
  return hasMessage(id) ? t(id) : (settingsHelpCache[helpLocale()]?.[id] ?? '');
};

/**
 * A setting's help text, `setHelp.<key>` (js/i18n/en.settingsHelp.js).
 *
 * It used to be a table of English sentences in this file: downloaded by every
 * visitor at start-up, shown in English to a Spanish reader, and written for
 * about half of the panel - several of them describing options the controls
 * did not have. It arrives on the first press of an info button.
 * @param {string} key - The setting
 * @param {string} label - Its label, for the generic sentence
 * @returns {Promise<string>}
 */
const getSettingTooltip = async (key, label) => {
  try {
    await loadSettingsHelp();
  } catch {
    /* the generic sentence below is still true */
  }
  return hasMessage(helpId(key))
    ? t(helpId(key))
    : t('settings.tooltip.generic', { label: label.toLowerCase() });
};

/**
 * Build the Settings panel from js/settingsSchema.js.
 *
 * `keep` rebuilds it around the values already pending in the panel instead of
 * the applied ones: what a reset does. Both resets used to start from the
 * applied values - the footer's Reset set every pending value to its default
 * and then rebuilt the panel from SETTINGS, so it put back what was there and
 * changed nothing.
 * @param {{keep?: boolean}} [options]
 */
const buildSettingsMenu = ({ keep = false } = {}) => {
  const settingsGrid = document.getElementById('settingsGrid');
  // What the reader had folded or opened survives a rebuild.
  const folded = new Set(
    [...settingsGrid.querySelectorAll('.settings-section.collapsed')].map(
      el => el.dataset.section
    )
  );
  const advancedOpen = Boolean(
    settingsGrid.querySelector('.settings-advanced')?.open
  );
  settingsGrid.innerHTML = '';
  if (!keep) {
    localSettings = JSON.parse(JSON.stringify(SETTINGS));
    pendingCourseLevel = getCourseLevel();
  }

  function updatePresetInfo(presetName) {
    const box = document.getElementById('presetInfo');
    const info = SCENARIO_INFO[presetName];
    if (!info || presetName === 'None') {
      box.innerHTML = '';
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    box.innerHTML = `<h4>${scenarioTitle(presetName)}</h4>${scenarioSummary(presetName)}`;
  }

  // The course level: a bundle of defaults, staged like any other change.
  // Choosing one sets the conservation check here and opens or closes
  // Advanced; Apply stores it and sets the units and the readout precision.
  const levelRow = document.createElement('div');
  levelRow.className = 'settings-level';
  const levelLabel = document.createElement('label');
  levelLabel.htmlFor = 'settingsCourseLevel';
  levelLabel.textContent = t('settings.level.label');
  const levelSelect = document.createElement('select');
  levelSelect.id = 'settingsCourseLevel';
  levelSelect.setAttribute('aria-describedby', 'settingsCourseLevelHint');
  for (const id of Object.keys(COURSE_LEVELS)) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = t(`settings.level.${id}`);
    option.selected = id === pendingCourseLevel;
    levelSelect.appendChild(option);
  }
  const levelHint = document.createElement('p');
  levelHint.id = 'settingsCourseLevelHint';
  levelHint.className = 'settings-level-hint';
  // What the level sets is help text, in the Settings help files: written
  // once they have arrived, which opening the panel asks for.
  levelHint.textContent = levelHintText(pendingCourseLevel);
  levelSelect.onchange = () => {
    pendingCourseLevel = levelSelect.value;
    const d = courseLevelDefaults(pendingCourseLevel);
    localSettings.show_conservation_diagnostics = d.conservation;
    buildSettingsMenu({ keep: true });
    const advancedBox = settingsGrid.querySelector('.settings-advanced');
    if (advancedBox) advancedBox.open = d.advancedOpen;
    document.getElementById('settingsCourseLevel')?.focus();
  };
  levelRow.append(levelLabel, levelSelect, levelHint);
  settingsGrid.appendChild(levelRow);

  // Motion: a preference of this device, applied at once and filled in by its
  // own lazy module (js/motionControl.js).
  const motionRow = document.createElement('div');
  motionRow.className = 'settings-level';
  settingsGrid.appendChild(motionRow);
  import('./motionControl.js').then(m =>
    m.fillMotionRow(motionRow, {
      t,
      getLocale,
      registerMessages,
      announce,
      modes: MOTION_MODES,
      preference: motionPreference,
      setPreference: setMotionPreference,
      pause: () => setPlaying(false),
    })
  );

  // The sections, in the schema's order. The advanced ones sit together in
  // one disclosure after the rest, closed until it is opened.
  let advanced = null;
  SETTING_SECTIONS.forEach(({ id, advanced: isAdvanced }) => {
    const section = { id, items: itemsOf(id) };
    if (!section.items.length) return;
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'settings-section';
    sectionDiv.dataset.section = id;
    if (folded.has(id)) sectionDiv.classList.add('collapsed');

    const headerDiv = document.createElement('div');
    headerDiv.className = 'settings-section-header';

    // The heading's own button folds the section. The header used to be a
    // <div> with a click handler, which a keyboard could not reach and a screen
    // reader did not report as a control at all.
    const titleDiv = document.createElement('h3');
    titleDiv.className = 'settings-section-title';
    const fold = document.createElement('button');
    fold.type = 'button';
    fold.className = 'settings-section-fold';
    fold.setAttribute('aria-expanded', String(!folded.has(id)));
    const toggleDiv = document.createElement('span');
    toggleDiv.className = 'settings-section-toggle';
    toggleDiv.setAttribute('aria-hidden', 'true');
    toggleDiv.textContent = '▼';
    fold.append(toggleDiv, t(sectionLabelId(id)));
    titleDiv.appendChild(fold);

    // Reset this section: its pending values back to the defaults, to be
    // applied or cancelled with everything else in the panel.
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'ui-button settings-section-reset';
    reset.textContent = t('settings.section.reset');
    reset.setAttribute(
      'aria-label',
      t('settings.section.resetNamed', { section: t(sectionLabelId(id)) })
    );
    reset.onclick = event => {
      event.stopPropagation();
      for (const item of section.items) {
        localSettings[item.key] = JSON.parse(
          JSON.stringify(DEFAULT_SETTINGS[item.key])
        );
      }
      buildSettingsMenu({ keep: true });
      settingsGrid
        .querySelector(`[data-section="${id}"] .settings-section-reset`)
        ?.focus();
      announce(
        t('settings.section.resetDone', { section: t(sectionLabelId(id)) })
      );
    };

    headerDiv.append(titleDiv, reset);

    // Create section content
    const contentDiv = document.createElement('div');
    contentDiv.className = 'settings-section-content';

    // Create grid for this section
    const sectionGrid = document.createElement('div');
    sectionGrid.className = 'settings-grid';
    // The two-column label/control split and the gap are set in CSS rather than
    // here, so a narrow screen can stack them. Inline styles cannot be beaten by
    // a media query, and on a 375px phone a fixed 1fr 1fr grid put the sliders
    // and the value readouts off the right edge of the panel - in English, and
    // further off in Spanish, where the labels are about a fifth longer.
    sectionGrid.style.alignItems = 'center';

    // Add items to this section
    section.items.forEach(item => {
      // Create label container with info icon
      const labelContainer = document.createElement('div');
      labelContainer.className = 'setting-label-container';

      const label = document.createElement('div');
      label.className = 'setting-label';
      label.textContent = t(item.labelId);

      // Create info icon
      const infoIcon = document.createElement('button');
      infoIcon.className = 'setting-info-icon';
      infoIcon.textContent = 'ⓘ';
      infoIcon.setAttribute(
        'aria-label',
        t('settings.info.about', { label: t(item.labelId) })
      );

      // Add click handler for tooltip using the new tooltip system
      infoIcon.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();

        const hadFocus = document.activeElement === infoIcon;
        getSettingTooltip(item.key, t(item.labelId)).then(text => {
          // The first press registers the deferred catalog, which translates
          // the page again and so rebuilds this panel: the button pressed has
          // been replaced by its twin by the time the words arrive. The help
          // goes to the twin, and so does the focus a keyboard reader had.
          const icon = infoIcon.isConnected
            ? infoIcon
            : document.querySelector(
                `#settingsGrid .setting-label-container[data-setting-key="${item.key}"] .setting-info-icon`
              );
          if (!icon) return;
          if (hadFocus && icon !== infoIcon) icon.focus();
          tooltipManager.show(text, icon, { position: 'bottom' });
        });
      });

      // Add label and icon to container
      labelContainer.appendChild(label);
      labelContainer.appendChild(infoIcon);

      const controlContainer = document.createElement('div');
      controlContainer.className = 'setting-control';
      const value = localSettings[item.key];

      // A row is two siblings in the grid rather than one wrapper - the label
      // and the control are separate children so the grid can align every
      // label against every control. The filter therefore has to hide them in
      // pairs, so both carry the same key and the same haystack. Searching the
      // setting's own key as well as its label means `bh_mass` finds the black
      // hole mass whichever language the interface is in.
      const haystack =
        `${t(item.labelId)} ${item.key} ${(item.options || []).join(' ')}`
          .toLowerCase()
          .trim();
      labelContainer.dataset.settingKey = item.key;
      controlContainer.dataset.settingKey = item.key;
      labelContainer.dataset.settingSearch = haystack;
      controlContainer.dataset.settingSearch = haystack;

      if (item.type === 'int' || item.type === 'float') {
        // The slider, its readout, and a label that is read but not seen.
        //
        // That label used to be visible, carrying the same words as the row
        // label a few pixels to its left. The comment justifying it said the
        // duplicate was invisible in a two-column layout because the two sat
        // side by side and read as one heading. They did not: the row is
        // label-then-control, so the words appeared twice, and being the widest
        // thing in the control the copy is what pushed the slider's value
        // readout off the right edge of the panel. It stays in the markup,
        // tied to the input by `for`, because a range input needs a label -
        // it is just no longer drawn.
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'setting-slider';

        const sliderLabel = document.createElement('label');
        sliderLabel.textContent = t(item.labelId);
        sliderLabel.className = 'visually-hidden';
        sliderLabel.htmlFor = `${item.key}-slider`;

        const sliderRow = document.createElement('div');
        sliderRow.className = 'setting-slider-row';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `${item.key}-slider`;
        slider.min = item.min;
        // A scenario may set a value above the range the slider was designed
        // for, and three of them do: the resonance scenarios run between 150
        // and 7,500 times the default speed, because a single libration of
        // Pluto's resonant angle takes twenty thousand years. With a fixed
        // maximum of 5 the slider would show as pinned, and the first touch
        // would drop the scenario to a speed at which nothing it is trying to
        // show can be seen - with no way back except reloading. Widening the
        // track to whatever is actually in force costs the ordinary case
        // nothing and keeps the control honest.
        slider.max = Math.max(Number(item.max), Number(value) || 0);
        slider.step = item.step;
        slider.value = value;

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'value-display';
        valueDisplay.textContent = Number(value).toFixed(
          item.precision || (item.type === 'float' ? 1 : 0)
        );
        slider.oninput = () => {
          const val =
            item.type === 'int'
              ? Math.trunc(slider.valueAsNumber)
              : slider.valueAsNumber;
          localSettings[item.key] = val;
          valueDisplay.textContent = val.toFixed(
            item.precision || (item.type === 'float' ? 1 : 0)
          );
          if (
            item.key === 'num_black_holes' ||
            item.key === 'use_individual_bh_masses'
          )
            updateIndivBHMassButtonVisibility();
        };
        sliderRow.append(slider, valueDisplay);
        sliderContainer.append(sliderLabel, sliderRow);
        controlContainer.append(sliderContainer);
      } else if (item.type === 'bool') {
        const button = document.createElement('button');
        button.className = 'toggle-button';
        button.textContent = value
          ? t('settings.toggle.on')
          : t('settings.toggle.off');
        button.setAttribute('data-state', value ? 'on' : 'off');
        button.onclick = () => {
          localSettings[item.key] = !localSettings[item.key];
          const newState = localSettings[item.key];
          button.textContent = newState
            ? t('settings.toggle.on')
            : t('settings.toggle.off');
          button.setAttribute('data-state', newState ? 'on' : 'off');
          if (item.key === 'use_individual_bh_masses')
            updateIndivBHMassButtonVisibility();
        };
        controlContainer.appendChild(button);
      } else if (item.type === 'option') {
        const select = document.createElement('select');
        item.options.forEach(opt => {
          const option = document.createElement('option');
          // The value stored is always the English token - it is the key the
          // physics engine, the scenario presets and every saved share link
          // use - and only the label a reader sees is translated. A locale that
          // changed the stored value would produce links that only open in that
          // language.
          option.value = opt;
          option.textContent = settingOptionLabel(item.key, opt);
          if (opt === value) option.selected = true;
          select.appendChild(option);
        });
        select.onchange = e => {
          localSettings[item.key] = e.target.value;
        };
        controlContainer.appendChild(select);
      } else if (item.type === 'color') {
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = value;
        colorInput.oninput = () => {
          localSettings[item.key] = colorInput.value;
        };
        controlContainer.appendChild(colorInput);
      }

      // Every control in this panel gets the setting's own name.
      //
      // The visible label is a <div class="setting-label"> sitting in a sibling
      // cell of the grid, which a sighted reader pairs with the control by
      // position and a screen reader cannot pair with it at all. The two
      // sliders build their own <label for> inside their container and were
      // fine; the selects, the on/off buttons and the two color pickers were
      // not. The color pickers had no accessible name of any kind - a reader
      // heard "color picker" twice with nothing to say which was the star and
      // which the planet.
      //
      // Applied here, after the branch, so it covers every control type at once
      // and a type added later inherits it.
      const control = controlContainer.querySelector(
        'input, select, textarea, button'
      );
      if (
        control &&
        !control.getAttribute('aria-label') &&
        !control.getAttribute('aria-labelledby')
      ) {
        control.setAttribute('aria-label', t(item.labelId));
      }
      // A toggle whose name is now the setting reports its state through
      // aria-pressed instead of through the word inside it.
      if (item.type === 'bool' && control) {
        control.setAttribute('aria-pressed', String(Boolean(value)));
        const previous = control.onclick;
        control.onclick = event => {
          previous?.call(control, event);
          control.setAttribute(
            'aria-pressed',
            String(control.getAttribute('data-state') === 'on')
          );
        };
      }

      sectionGrid.append(labelContainer, controlContainer);

      // Special handling for orbit decay rate button
      if (item.key === 'orbit_decay_rate') {
        const bhMassBtnContainer = document.createElement('div');
        bhMassBtnContainer.style.gridColumn = '1 / -1';
        bhMassBtnContainer.style.textAlign = 'center';
        // Built rather than written as markup, so its words come from the
        // catalog: it was the one English button left in a Spanish panel.
        const bhMassBtn = document.createElement('button');
        bhMassBtn.id = 'indivBHMassBtn';
        bhMassBtn.className = 'ui-button';
        bhMassBtn.style.marginTop = '10px';
        bhMassBtn.textContent = t('settings.button.indivBhMasses');
        bhMassBtn.onclick = showIndivBHMassMenu;
        bhMassBtnContainer.appendChild(bhMassBtn);
        sectionGrid.appendChild(bhMassBtnContainer);
      }
    });

    contentDiv.appendChild(sectionGrid);
    sectionDiv.appendChild(headerDiv);
    sectionDiv.appendChild(contentDiv);
    if (isAdvanced) {
      if (!advanced) {
        advanced = document.createElement('details');
        advanced.className = 'settings-advanced';
        advanced.open = advancedOpen;
        const summary = document.createElement('summary');
        summary.textContent = t('settings.section.advanced');
        advanced.appendChild(summary);
        settingsGrid.appendChild(advanced);
      }
      advanced.appendChild(sectionDiv);
    } else {
      settingsGrid.appendChild(sectionDiv);
    }

    fold.onclick = () => {
      const shut = sectionDiv.classList.toggle('collapsed');
      fold.setAttribute('aria-expanded', String(!shut));
    };
    // The whole header still folds it for a pointer, as it always did.
    headerDiv.addEventListener('click', event => {
      if (event.target === headerDiv) fold.click();
    });
  });

  updateIndivBHMassButtonVisibility();
  updatePresetInfo(localSettings.preset_scenario);
  wireSettingsFilter();
};

/**
 * Filter the settings panel down to the rows whose name matches a query.
 *
 * Sixty-three settings across nine collapsible sections is more than anyone
 * scans: finding `softening` meant opening sections until it appeared. Typing
 * narrows the panel to the matching rows, opens the sections holding them and
 * folds away the ones left empty, so the answer to "where is that setting" is
 * the same gesture every time.
 *
 * Rebuilt with the panel, so it re-reads the DOM each time rather than holding
 * references to elements that no longer exist. The query survives a rebuild -
 * a language change repaints the panel and should not also clear the box.
 */
const wireSettingsFilter = () => {
  const input = document.getElementById('settingsFilter');
  const empty = document.getElementById('settingsFilterEmpty');
  if (!input) return;

  const apply = () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;

    document.querySelectorAll('.settings-section').forEach(section => {
      let matchesHere = 0;
      section.querySelectorAll('[data-setting-search]').forEach(el => {
        const hit = !query || el.dataset.settingSearch.includes(query);
        el.hidden = !hit;
        // Both halves of a row carry the key, so counting one of them counts
        // the row.
        if (hit && el.classList.contains('setting-control')) matchesHere++;
      });
      section.hidden = Boolean(query) && matchesHere === 0;
      // A section folded shut would hide its own matches, so searching opens
      // the ones that have something to show. Clearing the box leaves them as
      // the reader left them rather than snapping everything closed again.
      if (query && matchesHere > 0) section.classList.remove('collapsed');
      shown += matchesHere;
    });

    // The Advanced disclosure opens for a match inside it and steps aside
    // for a search that has nothing there.
    const advanced = document.querySelector('#settingsGrid .settings-advanced');
    if (advanced) {
      const hits = [...advanced.querySelectorAll('.settings-section')].some(
        section => !section.hidden
      );
      advanced.hidden = Boolean(query) && !hits;
      if (query && hits) advanced.open = true;
    }

    if (empty) empty.hidden = !query || shown > 0;
  };

  input.oninput = apply;
  // Escape clears the filter before the panel's own Escape closes the panel,
  // which is what a reader who has typed into a search box expects the key to
  // do first.
  input.onkeydown = event => {
    if (event.key === 'Escape' && input.value) {
      event.stopPropagation();
      input.value = '';
      apply();
    }
  };
  apply();
};

// BH Masses Modal visibility management - matching original exactly
const updateIndivBHMassButtonVisibility = () => {
  const btn = document.getElementById('indivBHMassBtn');
  if (btn)
    btn.style.display =
      localSettings.use_individual_bh_masses &&
      localSettings.num_black_holes > 1
        ? 'inline-block'
        : 'none';
};

const showIndivBHMassMenu = async () => {
  const content = document.getElementById('bhMassesContent');
  content.innerHTML = '';
  const num_bh = localSettings.num_black_holes;
  if (!localSettings.bh_masses || localSettings.bh_masses.length !== num_bh) {
    localSettings.bh_masses = Array(num_bh).fill(localSettings.bh_mass);
  }

  for (let i = 0; i < num_bh; i++) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'bh-mass-item';

    const label = document.createElement('label');
    label.textContent = t('settings.bhMass.item', { n: i + 1 });

    const controlDiv = document.createElement('div');
    controlDiv.className = 'bh-mass-control';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = 0.1;
    slider.max = 1000;
    slider.step = 0.1;
    slider.value = localSettings.bh_masses[i];
    slider.dataset.index = i;

    const valueDisplay = document.createElement('span');
    valueDisplay.className = 'value-display';
    valueDisplay.innerHTML = solarHTML(slider.valueAsNumber.toFixed(1));

    slider.oninput = e => {
      const index = parseInt(e.target.dataset.index, 10);
      const val = e.target.valueAsNumber;
      localSettings.bh_masses[index] = val;
      valueDisplay.innerHTML = solarHTML(val.toFixed(1));
    };

    controlDiv.append(slider, valueDisplay);
    itemDiv.append(label, controlDiv);
    content.appendChild(itemDiv);
  }
  // A dialog over Settings, through js/dialog.js like Settings itself, which
  // is loaded by definition: the button is inside the Settings panel. Settings
  // is inert behind it, and every close but Done - the close chip, Escape -
  // puts the masses back as they were, which is what the chip says it does.
  const masses = [...localSettings.bh_masses];
  const { openDialog } = await dialog();
  openDialog(document.getElementById('bhMassesModal'), {
    isolate: true,
    trigger: document.getElementById('indivBHMassBtn'),
    initialFocus: '#bhMassesContent input',
    onClose: reason => {
      if (reason !== 'done') localSettings.bh_masses = masses;
    },
  });
};

// Legacy function for backward compatibility
const showBHMassesModal = () => {
  showIndivBHMassMenu();
};

/** @param {string} [reason] - 'done' keeps the masses; anything else does not */
const hideBHMassesModal = (reason = 'done') => {
  dialogModule?.closeDialog(document.getElementById('bhMassesModal'), reason);
};

export {
  localSettings,
  setLocalSettings,
  getPendingCourseLevel,
  fetchSettingsHelp,
  levelHintText,
  buildSettingsMenu,
  showBHMassesModal,
  hideBHMassesModal,
};
