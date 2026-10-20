/**
 * save.js — Save/Load System for "The Last Knock"
 *
 * Manages game save slots using localStorage.
 *   - Slot 1: reserved for autosave
 *   - Slots 2–5: manual saves
 *
 * Discovery progress (which story nodes the player has visited across ALL
 * playthroughs) is stored separately and is never cleared by New Game.
 *
 * localStorage key scheme:
 *   'the_last_knock_slot_1' … 'the_last_knock_slot_5'  — save data
 *   'the_last_knock_discovered'                         — persistent discovery
 */

(function () {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*  Constants                                                          */
  /* ------------------------------------------------------------------ */

  /** Prefix used for every save-slot key in localStorage. */
  var SLOT_PREFIX = 'the_last_knock_slot_';

  /** localStorage key for the persistent discovered-nodes set. */
  var DISCOVERED_KEY = 'the_last_knock_discovered';

  /** Total number of save slots available. */
  var TOTAL_SLOTS = 5;

  /** Slot reserved for autosaving. */
  var AUTOSAVE_SLOT = 1;

  /* ------------------------------------------------------------------ */
  /*  Helper — format play-time for display                              */
  /* ------------------------------------------------------------------ */

  /**
   * Converts a duration in seconds into a human-readable string.
   *
   * Rules:
   *   - If >= 1 hour  → "Xh Ym"   (e.g. "2h 15m")
   *   - If < 1 hour   → "Ym Zs"   (e.g. "12m 5s")
   *   - Edge case 0   → "0m 0s"
   *
   * @param  {number} seconds  Total elapsed seconds (non-negative).
   * @return {string}          Formatted time string.
   */
  function formatPlayTime(seconds) {
    /* Guard against bad input. */
    if (typeof seconds !== 'number' || seconds < 0 || isNaN(seconds)) {
      seconds = 0;
    }

    seconds = Math.floor(seconds);

    var hours   = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs    = seconds % 60;

    if (hours >= 1) {
      return hours + 'h ' + minutes + 'm';
    }
    return minutes + 'm ' + secs + 's';
  }

  /* ------------------------------------------------------------------ */
  /*  SaveManager constructor                                            */
  /* ------------------------------------------------------------------ */

  /**
   * Creates a new SaveManager instance.
   * All persistence is handled through the browser's localStorage API.
   */
  function SaveManager() {
    /* Nothing to initialise — localStorage is always available. */
  }

  /* Attach the static helper so callers can use it without an instance. */
  SaveManager.formatPlayTime = formatPlayTime;

  /* ------------------------------------------------------------------ */
  /*  Private helpers (on the prototype for shared access)               */
  /* ------------------------------------------------------------------ */

  /**
   * Builds the localStorage key for a given slot.
   * @param  {number} slotId  1–5
   * @return {string}
   */
  SaveManager.prototype._key = function (slotId) {
    return SLOT_PREFIX + slotId;
  };

  /**
   * Safely reads and parses JSON from localStorage.
   * @param  {string} key  localStorage key.
   * @return {*}           Parsed value, or null on failure / missing key.
   */
  SaveManager.prototype._readJSON = function (key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('[SaveManager] Failed to parse key "' + key + '":', e);
      return null;
    }
  };

  /**
   * Safely serialises a value and writes it to localStorage.
   * @param {string} key   localStorage key.
   * @param {*}      value Value to serialise.
   */
  SaveManager.prototype._writeJSON = function (key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('[SaveManager] Failed to write key "' + key + '":', e);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Core save / load API                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Saves the current game state to the specified slot.
   *
   * @param {number} slotId     Slot number (1–5).
   * @param {Object} gameState  State snapshot:
   *   @param {number}   gameState.currentNodeId     Active story-node ID.
   *   @param {number[]} gameState.discoveredNodes   All node IDs found so far.
   *   @param {number}   gameState.playTimeSeconds   Total play time in seconds.
   *   @param {string}   gameState.currentNodeTitle  Title of the current node.
   */
  SaveManager.prototype.save = function (slotId, gameState) {
    if (slotId < 1 || slotId > TOTAL_SLOTS) {
      console.warn('[SaveManager] Invalid slot ID:', slotId);
      return;
    }

    var data = {
      currentNodeId:    gameState.currentNodeId,
      discoveredNodes:  gameState.discoveredNodes || [],
      timestamp:        new Date().toISOString(),
      playTimeSeconds:  gameState.playTimeSeconds || 0,
      currentNodeTitle: gameState.currentNodeTitle || ''
    };

    this._writeJSON(this._key(slotId), data);
  };

  /**
   * Loads the game state stored in a slot.
   *
   * @param  {number}      slotId  Slot number (1–5).
   * @return {Object|null}         The saved gameState object, or null if empty.
   */
  SaveManager.prototype.load = function (slotId) {
    if (slotId < 1 || slotId > TOTAL_SLOTS) {
      console.warn('[SaveManager] Invalid slot ID:', slotId);
      return null;
    }
    return this._readJSON(this._key(slotId));
  };

  /**
   * Shortcut — autosaves to Slot 1.
   *
   * @param {Object} gameState  Same shape as save().
   */
  SaveManager.prototype.autoSave = function (gameState) {
    this.save(AUTOSAVE_SLOT, gameState);
  };

  /* ------------------------------------------------------------------ */
  /*  Slot information                                                   */
  /* ------------------------------------------------------------------ */

  /**
   * Returns metadata for a single save slot (useful for the UI).
   *
   * @param  {number} slotId  Slot number (1–5).
   * @return {Object}         Slot info object:
   *   { slotId, isEmpty, isAutoSave, timestamp, currentNodeTitle, playTimeSeconds }
   */
  SaveManager.prototype.getSlotInfo = function (slotId) {
    var data = this.load(slotId);

    if (!data) {
      return {
        slotId:           slotId,
        isEmpty:          true,
        isAutoSave:       slotId === AUTOSAVE_SLOT,
        timestamp:        null,
        currentNodeTitle: '',
        playTimeSeconds:  0
      };
    }

    return {
      slotId:           slotId,
      isEmpty:          false,
      isAutoSave:       slotId === AUTOSAVE_SLOT,
      timestamp:        data.timestamp || null,
      currentNodeTitle: data.currentNodeTitle || '',
      playTimeSeconds:  data.playTimeSeconds || 0
    };
  };

  /**
   * Returns an array of slot-info objects for every slot (1–5).
   *
   * @return {Object[]}  Array of 5 slot info objects (same shape as getSlotInfo).
   */
  SaveManager.prototype.getAllSlots = function () {
    var slots = [];
    for (var i = 1; i <= TOTAL_SLOTS; i++) {
      slots.push(this.getSlotInfo(i));
    }
    return slots;
  };

  /**
   * Returns true if at least one save slot contains data.
   *
   * @return {boolean}
   */
  SaveManager.prototype.hasSaves = function () {
    for (var i = 1; i <= TOTAL_SLOTS; i++) {
      if (this.load(i) !== null) return true;
    }
    return false;
  };

  /**
   * Finds the most recently saved slot (by timestamp) and returns its data.
   *
   * @return {Object|null}  The saved gameState of the newest slot, or null.
   */
  SaveManager.prototype.getMostRecentSave = function () {
    var newest     = null;
    var newestTime = 0;

    for (var i = 1; i <= TOTAL_SLOTS; i++) {
      var data = this.load(i);
      if (!data || !data.timestamp) continue;

      var t = new Date(data.timestamp).getTime();
      if (t > newestTime) {
        newestTime = t;
        newest     = data;
      }
    }

    return newest;
  };

  /**
   * Deletes a save slot from localStorage.
   *
   * @param {number} slotId  Slot number (1–5).
   */
  SaveManager.prototype.deleteSlot = function (slotId) {
    if (slotId < 1 || slotId > TOTAL_SLOTS) {
      console.warn('[SaveManager] Invalid slot ID:', slotId);
      return;
    }
    try {
      localStorage.removeItem(this._key(slotId));
    } catch (e) {
      console.error('[SaveManager] Failed to delete slot ' + slotId + ':', e);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Persistent discovery tracking                                      */
  /* ------------------------------------------------------------------ */

  /**
   * Returns the array of node IDs the player has ever discovered.
   * This list persists across all playthroughs and is independent of saves.
   *
   * @return {number[]}  Array of discovered node IDs (may be empty).
   */
  SaveManager.prototype.getDiscoveredNodes = function () {
    var data = this._readJSON(DISCOVERED_KEY);
    return Array.isArray(data) ? data : [];
  };

  /**
   * Overwrites the entire discovered-nodes list in persistent storage.
   *
   * @param {number[]} nodeIdsArray  Complete list of discovered node IDs.
   */
  SaveManager.prototype.saveDiscoveredNodes = function (nodeIdsArray) {
    this._writeJSON(DISCOVERED_KEY, nodeIdsArray || []);
  };

  /**
   * Adds a single node ID to the persistent discovered set (no duplicates).
   *
   * @param {number} nodeId  The node ID to add.
   */
  SaveManager.prototype.addDiscoveredNode = function (nodeId) {
    var nodes = this.getDiscoveredNodes();
    if (nodes.indexOf(nodeId) === -1) {
      nodes.push(nodeId);
      this.saveDiscoveredNodes(nodes);
    }
  };

  /**
   * Adds multiple node IDs to the persistent discovered set (no duplicates).
   *
   * @param {number[]} nodeIdsArray  Array of node IDs to add.
   */
  SaveManager.prototype.addDiscoveredNodes = function (nodeIdsArray) {
    if (!Array.isArray(nodeIdsArray) || nodeIdsArray.length === 0) return;

    var nodes   = this.getDiscoveredNodes();
    var changed = false;

    for (var i = 0; i < nodeIdsArray.length; i++) {
      if (nodes.indexOf(nodeIdsArray[i]) === -1) {
        nodes.push(nodeIdsArray[i]);
        changed = true;
      }
    }

    if (changed) {
      this.saveDiscoveredNodes(nodes);
    }
  };

  /* ------------------------------------------------------------------ */
  /*  Expose on window                                                   */
  /* ------------------------------------------------------------------ */

  window.SaveManager = SaveManager;
  window.saveManager = new SaveManager();

})();