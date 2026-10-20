/* ============================================================
 *  game.js — Main Game Controller for "The Last Knock"
 *
 *  Manages all screens, game state, timer, decisions,
 *  save/load integration, auto-save, and story progression.
 *
 *  Dependencies (loaded before this file):
 *    window.storyTree         — from tree.js
 *    window.saveManager       — from save.js
 *    window.SaveManager       — from save.js
 *    window.StoryPathRenderer — from storypath.js
 * ============================================================ */

(function () {
    'use strict';

    // ── Constants ───────────────────────────────────────────
    var DECISION_TIME   = 10;          // seconds per decision
    var AUTOSAVE_INTERVAL = 10;        // seconds between autosaves
    var TITLE_FADEIN    = 2000;        // ms
    var TITLE_HOLD      = 2000;        // ms
    var TITLE_FADEOUT   = 1500;        // ms

    // ── Game State ──────────────────────────────────────────
    var state = {
        currentNode:      null,        // current StoryNode
        discoveredNodes:  [],          // array of node IDs
        playTimeSeconds:  0,           // total play time
        isPaused:         false,
        isInGame:         false,
        decisionMade:     false,       // prevents double input
        timerRunning:     false
    };

    // Decision-timer variables (one clock drives the bar AND the runner)
    var timerRaf           = null;     // requestAnimationFrame id
    var timerElapsed       = 0;        // ms of the decision time already used
    var timerLastTick      = 0;        // timestamp of the previous frame

    // Pending scene timeouts (continue prompt, ending, game over) so they can be cancelled
    var sceneTimeouts      = [];

    // Auto-save interval
    var autoSaveInterval   = null;
    var playTimeInterval   = null;

    // Story path renderer
    var storyPathRenderer  = null;

    // ── DOM References ──────────────────────────────────────
    var dom = {};

    function cacheDom() {
        // Screens
        dom.screenTitle    = document.getElementById('screen-title');
        dom.screenMenu     = document.getElementById('screen-menu');
        dom.screenGame     = document.getElementById('screen-game');
        dom.screenGameover = document.getElementById('screen-gameover');

        // Title
        dom.titleText      = document.getElementById('title-text');
        dom.titleSubtitle  = document.getElementById('title-subtitle');

        // Menu buttons
        dom.btnContinue    = document.getElementById('btn-continue');
        dom.btnNewGame     = document.getElementById('btn-newgame');
        dom.btnLoadGame    = document.getElementById('btn-loadgame');
        dom.btnStoryPath   = document.getElementById('btn-storypath-menu');
        dom.btnQuit        = document.getElementById('btn-quit');

        // Game scene
        dom.sceneImage     = document.getElementById('scene-image');
        dom.storyOverlay   = document.getElementById('story-overlay');
        dom.storyText      = document.getElementById('story-text');
        dom.choicesContainer = document.getElementById('choices-container');
        dom.choiceLeft     = document.getElementById('choice-left');
        dom.choiceRight    = document.getElementById('choice-right');
        dom.choiceLeftText = document.getElementById('choice-left-text');
        dom.choiceRightText= document.getElementById('choice-right-text');
        dom.endingDisplay  = document.getElementById('ending-display');
        dom.endingTitle    = document.getElementById('ending-title');
        dom.endingType     = document.getElementById('ending-type');
        dom.continuePrompt = document.getElementById('continue-prompt');
        dom.btnContinueStory = document.getElementById('btn-continue-story');

        // Timer
        dom.timerContainer = document.getElementById('timer-container');
        dom.timerProgress  = document.getElementById('timer-progress');
        dom.timerRunner    = document.getElementById('timer-runner');
        dom.timerSeconds   = document.getElementById('timer-seconds');

        // HUD
        dom.gameHud        = document.getElementById('game-hud');
        dom.hudPause       = document.getElementById('hud-pause');
        dom.hudSave        = document.getElementById('hud-save');
        dom.hudLoad        = document.getElementById('hud-load');
        dom.hudMap          = document.getElementById('hud-map');
        dom.hudQuit        = document.getElementById('hud-quit');

        // Overlays
        dom.overlaySave    = document.getElementById('overlay-save');
        dom.overlayLoad    = document.getElementById('overlay-load');
        dom.overlayStorypath = document.getElementById('overlay-storypath');
        dom.overlayPause   = document.getElementById('overlay-pause');
        dom.overlayQuit    = document.getElementById('overlay-quit-confirm');
        dom.saveSlotGrid   = document.getElementById('save-slot-grid');
        dom.loadSlotGrid   = document.getElementById('load-slot-grid');
        dom.storypathTree  = document.getElementById('storypath-tree');

        // Overlay close buttons
        dom.saveClose      = document.getElementById('save-close');
        dom.loadClose      = document.getElementById('load-close');
        dom.storypathClose = document.getElementById('storypath-close');
        dom.btnResume      = document.getElementById('btn-resume');
        dom.btnQuitYes     = document.getElementById('btn-quit-yes');
        dom.btnQuitNo      = document.getElementById('btn-quit-no');

        // Game Over
        dom.gameoverImage  = document.getElementById('gameover-image');
        dom.gameoverEnding = document.getElementById('gameover-ending');
        dom.gameoverType   = document.getElementById('gameover-type');
        dom.btnGameoverMenu= document.getElementById('btn-gameover-menu');
    }

    // ── Cancellable scene timeouts ──────────────────────────
    function later(fn, ms) {
        sceneTimeouts.push(setTimeout(fn, ms));
    }

    function clearSceneTimeouts() {
        while (sceneTimeouts.length) clearTimeout(sceneTimeouts.pop());
    }

    // ── Screen Management ───────────────────────────────────
    function showScreen(screenEl) {
        var screens = document.querySelectorAll('.screen');
        for (var i = 0; i < screens.length; i++) {
            screens[i].classList.remove('active');
        }
        screenEl.classList.add('active');
    }

    function showOverlay(overlayEl) {
        overlayEl.classList.add('active');
    }

    function hideOverlay(overlayEl) {
        overlayEl.classList.remove('active');
    }

    function hideAllOverlays() {
        var overlays = document.querySelectorAll('.overlay');
        for (var i = 0; i < overlays.length; i++) {
            overlays[i].classList.remove('active');
        }
    }

    // ── Title Screen Animation ──────────────────────────────
    function playTitleAnimation() {
        showScreen(dom.screenTitle);
        dom.titleText.style.opacity = '0';
        dom.titleSubtitle.style.opacity = '0';

        // Fade in
        setTimeout(function () {
            dom.titleText.style.transition = 'opacity ' + (TITLE_FADEIN / 1000) + 's ease-in';
            dom.titleText.style.opacity = '1';
            setTimeout(function () {
                dom.titleSubtitle.style.transition = 'opacity 1s ease-in';
                dom.titleSubtitle.style.opacity = '1';
            }, 800);
        }, 500);

        // Hold, then fade out
        setTimeout(function () {
            dom.titleText.style.transition = 'opacity ' + (TITLE_FADEOUT / 1000) + 's ease-out';
            dom.titleSubtitle.style.transition = 'opacity ' + (TITLE_FADEOUT / 1000) + 's ease-out';
            dom.titleText.style.opacity = '0';
            dom.titleSubtitle.style.opacity = '0';
        }, 500 + TITLE_FADEIN + TITLE_HOLD);

        // Show menu
        setTimeout(function () {
            goToMenu();
        }, 500 + TITLE_FADEIN + TITLE_HOLD + TITLE_FADEOUT + 300);
    }

    // ── Main Menu ───────────────────────────────────────────
    function goToMenu() {
        stopGameTimers();
        state.isInGame = false;
        hideAllOverlays();
        showScreen(dom.screenMenu);
        updateContinueButton();
    }

    function updateContinueButton() {
        var recent = window.saveManager.getMostRecentSave();
        if (recent) {
            dom.btnContinue.disabled = false;
            dom.btnContinue.classList.remove('disabled');
        } else {
            dom.btnContinue.disabled = true;
            dom.btnContinue.classList.add('disabled');
        }
    }

    // ── New Game ────────────────────────────────────────────
    function startNewGame() {
        state.currentNode     = window.storyTree.getRoot();
        state.discoveredNodes = [];
        state.playTimeSeconds = 0;
        state.isPaused        = false;
        state.decisionMade    = false;

        // Discover the root node
        discoverNode(state.currentNode.id);

        // Start gameplay
        state.isInGame = true;
        showScreen(dom.screenGame);
        showScene(state.currentNode);
        startGameTimers();
    }

    // ── Load a Saved Game ───────────────────────────────────
    function loadGame(slotId) {
        var data = window.saveManager.load(slotId);
        if (!data) return false;

        state.currentNode     = window.storyTree.getNode(data.currentNodeId);
        state.playTimeSeconds = data.playTimeSeconds || 0;
        state.isPaused        = false;
        state.decisionMade    = false;

        // Restore discovered nodes (merge with persistent discovery)
        var persistent = window.saveManager.getDiscoveredNodes();
        var saved      = data.discoveredNodes || [];
        var merged     = mergeArrays(persistent, saved);
        state.discoveredNodes = merged;
        window.saveManager.saveDiscoveredNodes(merged);

        // Start gameplay
        state.isInGame = true;
        hideAllOverlays();
        showScreen(dom.screenGame);
        showScene(state.currentNode);
        startGameTimers();
        return true;
    }

    function mergeArrays(a, b) {
        var set = {};
        var result = [];
        var i;
        for (i = 0; i < a.length; i++) set[a[i]] = true;
        for (i = 0; i < b.length; i++) set[b[i]] = true;
        for (var key in set) {
            if (set.hasOwnProperty(key)) result.push(Number(key));
        }
        return result.sort(function(x, y) { return x - y; });
    }

    // ── Scene Display ───────────────────────────────────────
    function showScene(node) {
        if (!node) return;

        // A new scene starts: drop anything still pending from the old one
        clearSceneTimeouts();
        stopDecisionTimer();

        // Fade transition
        dom.screenGame.classList.add('scene-transition');
        setTimeout(function() {
            dom.screenGame.classList.remove('scene-transition');
        }, 600);

        // Set scene image
        dom.sceneImage.src = node.image;

        // Set story text with typewriter-like appearance
        dom.storyText.textContent = '';
        dom.storyText.style.opacity = '0';
        later(function() {
            dom.storyText.textContent = node.storyText;
            dom.storyText.style.opacity = '1';
        }, 300);

        // Hide choices and timer initially
        dom.choicesContainer.style.display = 'none';
        dom.timerContainer.style.display = 'none';
        dom.endingDisplay.style.display = 'none';
        dom.continuePrompt.style.display = 'none';

        if (node.isEnding) {
            // Show ending — delay slightly for dramatic effect
            later(function () {
                showEnding(node);
            }, 2500);
        } else {
            // Show "click to continue" then show choices
            later(function () {
                dom.continuePrompt.style.display = 'block';
            }, 1500);
        }
    }

    function onContinueStory() {
        dom.continuePrompt.style.display = 'none';
        showChoices(state.currentNode);
    }

    // ── Decision / Choices ──────────────────────────────────
    function showChoices(node) {
        if (!node || node.isEnding) return;

        state.decisionMade = false;

        // Populate choice text
        dom.choiceLeftText.textContent  = node.leftChoiceText;
        dom.choiceRightText.textContent = node.rightChoiceText;

        // Show choices container
        dom.choicesContainer.style.display = 'flex';

        // Start decision timer
        startDecisionTimer();
    }

    function makeChoice(direction) {
        if (state.decisionMade || state.isPaused) return;
        state.decisionMade = true;

        // Stop timer
        stopDecisionTimer();

        // Get next node
        var nextNode = (direction === 'left')
            ? state.currentNode.left
            : state.currentNode.right;

        if (!nextNode) return;

        // Discover the next node
        discoverNode(nextNode.id);

        // Advance to next node
        state.currentNode = nextNode;
        showScene(state.currentNode);
    }

    function onTimeout() {
        if (state.decisionMade) return;
        state.decisionMade = true;

        stopDecisionTimer();

        // Show timeout death scene (Node 0)
        var timeoutNode = window.storyTree.getTimeoutNode();
        discoverNode(0); // Discover the timeout node too
        state.currentNode = timeoutNode;
        showScene(timeoutNode);
    }

    // ── Decision Timer (10 seconds) ─────────────────────────
    // A single requestAnimationFrame loop owns the clock. Every frame it sets
    // --p (0 → 1) on the timer container; the CSS uses that one value for the
    // bar fill, the runner position and the colour, so they always agree.
    // Pausing just stops the clock from advancing — nothing has to be
    // re-started or re-calculated on resume.
    function renderTimer() {
        var total = DECISION_TIME * 1000;
        var p = Math.min(timerElapsed / total, 1);
        var secondsLeft = Math.max(0, Math.ceil((total - timerElapsed) / 1000));

        dom.timerContainer.style.setProperty('--p', p);
        dom.timerSeconds.textContent = secondsLeft;
        dom.timerContainer.classList.toggle('urgent', secondsLeft <= 3);
    }

    function timerTick(now) {
        if (!state.timerRunning) return;

        // Clamp the step so a hidden/background tab can't burn the player's time
        var dt = Math.max(0, Math.min(now - timerLastTick, 100));
        timerLastTick = now;
        if (!state.isPaused) timerElapsed += dt;

        renderTimer();

        if (timerElapsed >= DECISION_TIME * 1000) {
            stopDecisionTimer();
            onTimeout();
            return;
        }
        timerRaf = requestAnimationFrame(timerTick);
    }

    function startDecisionTimer() {
        stopDecisionTimer();

        timerElapsed  = 0;
        timerLastTick = performance.now();
        state.timerRunning = true;

        dom.timerContainer.style.display = 'flex';
        dom.timerContainer.classList.remove('urgent');
        dom.timerContainer.classList.toggle('paused', state.isPaused);
        renderTimer();

        timerRaf = requestAnimationFrame(timerTick);
    }

    function stopDecisionTimer() {
        state.timerRunning = false;
        if (timerRaf) {
            cancelAnimationFrame(timerRaf);
            timerRaf = null;
        }
        timerElapsed = 0;
        dom.timerContainer.style.display = 'none';
        dom.timerContainer.classList.remove('urgent');
    }

    // ── Pause / Resume ──────────────────────────────────────
    // silent = true pauses the game without showing the "PAUSED" overlay
    // (used when Save / Load / Story Path / Quit open their own overlay).
    function pauseGame(silent) {
        if (!state.isInGame || state.isPaused) return;
        state.isPaused = true;

        dom.timerContainer.classList.add('paused');   // freezes the runner's legs
        if (!silent) showOverlay(dom.overlayPause);
    }

    function resumeGame() {
        if (!state.isPaused) return;
        state.isPaused = false;

        dom.timerContainer.classList.remove('paused');
        hideOverlay(dom.overlayPause);
    }

    // ── Ending / Game Over ──────────────────────────────────
    function showEnding(node) {
        // Show ending info on the game screen first
        dom.endingDisplay.style.display = 'block';
        dom.endingTitle.textContent = node.endingTitle;

        if (node.endingType === 'bad') {
            dom.endingType.textContent = '💀 Bad End';
            dom.endingType.className = 'ending-type bad';
        } else {
            dom.endingType.textContent = '✅ Survived!';
            dom.endingType.className = 'ending-type survival';
        }

        // Transition to Game Over screen after delay
        later(function () {
            showGameOver(node);
        }, 3000);
    }

    function showGameOver(node) {
        stopGameTimers();
        state.isInGame = false;

        // Set game over screen content
        dom.gameoverImage.src = node.image;
        dom.gameoverEnding.textContent = node.endingTitle;

        if (node.endingType === 'bad') {
            dom.gameoverType.textContent = '💀 Bad End';
            dom.gameoverType.className = 'gameover-type bad';
        } else {
            dom.gameoverType.textContent = '✅ You Survived!';
            dom.gameoverType.className = 'gameover-type survival';
        }

        showScreen(dom.screenGameover);
    }

    // ── Node Discovery ──────────────────────────────────────
    function discoverNode(nodeId) {
        if (state.discoveredNodes.indexOf(nodeId) === -1) {
            state.discoveredNodes.push(nodeId);
        }
        window.saveManager.addDiscoveredNode(nodeId);
    }

    // ── Save/Load UI ────────────────────────────────────────
    function openSaveOverlay() {
        if (!state.isInGame) return;
        pauseGame(true);
        renderSlotGrid(dom.saveSlotGrid, 'save');
        showOverlay(dom.overlaySave);
    }

    function openLoadOverlay(fromMenu) {
        if (!fromMenu && state.isInGame) {
            pauseGame(true);
        }
        renderSlotGrid(dom.loadSlotGrid, 'load');
        showOverlay(dom.overlayLoad);
    }

    function renderSlotGrid(container, mode) {
        container.innerHTML = '';
        var slots = window.saveManager.getAllSlots();

        for (var i = 0; i < slots.length; i++) {
            var slot = slots[i];
            var card = document.createElement('div');
            card.className = 'slot-card' +
                (slot.isEmpty ? ' empty' : '') +
                (slot.isAutoSave ? ' autosave' : '');

            // Badge
            var badge = document.createElement('div');
            badge.className = 'slot-badge';
            badge.textContent = slot.isAutoSave ? '🔄 AUTO' : 'SLOT ' + slot.slotId;
            card.appendChild(badge);

            if (slot.isEmpty) {
                var emptyText = document.createElement('div');
                emptyText.className = 'slot-empty-text';
                emptyText.textContent = '— Empty —';
                card.appendChild(emptyText);
            } else {
                var info = document.createElement('div');
                info.className = 'slot-info';

                var title = document.createElement('div');
                title.className = 'slot-node-title';
                title.textContent = '📍 ' + (slot.currentNodeTitle || 'Unknown');
                info.appendChild(title);

                var time = document.createElement('div');
                time.className = 'slot-time';
                time.textContent = '🕐 ' + formatDate(slot.timestamp);
                info.appendChild(time);

                var playtime = document.createElement('div');
                playtime.className = 'slot-playtime';
                playtime.textContent = '⏱ ' + window.SaveManager.formatPlayTime(slot.playTimeSeconds || 0);
                info.appendChild(playtime);

                card.appendChild(info);
            }

            // Click behavior
            (function (slotId, isEmpty, isAutoSave) {
                card.addEventListener('click', function () {
                    if (mode === 'save') {
                        if (isAutoSave) return;  // Can't manually save to autosave slot
                        doSave(slotId);
                    } else {
                        if (isEmpty) return;     // Can't load empty slot
                        doLoad(slotId);
                    }
                });
            })(slot.slotId, slot.isEmpty, slot.isAutoSave);

            // Disable autosave slot in save mode
            if (mode === 'save' && slot.isAutoSave) {
                card.classList.add('disabled');
                card.title = 'Autosave slot — saves automatically every 10 seconds';
            }

            // Disable empty slots in load mode
            if (mode === 'load' && slot.isEmpty) {
                card.classList.add('disabled');
            }

            container.appendChild(card);
        }
    }

    function doSave(slotId) {
        var gameState = {
            currentNodeId:    state.currentNode.id,
            discoveredNodes:  state.discoveredNodes.slice(),
            playTimeSeconds:  state.playTimeSeconds,
            currentNodeTitle: state.currentNode.title
        };
        window.saveManager.save(slotId, gameState);

        // Refresh the grid to show updated info
        renderSlotGrid(dom.saveSlotGrid, 'save');

        // Flash a brief "Saved!" confirmation
        showNotification('💾 Game Saved!');
    }

    function doLoad(slotId) {
        hideAllOverlays();
        var success = loadGame(slotId);
        if (!success) {
            showNotification('❌ Failed to load save');
        }
    }

    function doAutoSave() {
        if (!state.isInGame || !state.currentNode) return;
        if (state.currentNode.isEnding) return;  // Don't autosave at endings

        var gameState = {
            currentNodeId:    state.currentNode.id,
            discoveredNodes:  state.discoveredNodes.slice(),
            playTimeSeconds:  state.playTimeSeconds,
            currentNodeTitle: state.currentNode.title
        };
        window.saveManager.autoSave(gameState);
    }

    // ── Notification Toast ──────────────────────────────────
    function showNotification(message) {
        var toast = document.createElement('div');
        toast.className = 'notification-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Trigger animation
        setTimeout(function () { toast.classList.add('show'); }, 10);
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 500);
        }, 2000);
    }

    // ── Story Path ──────────────────────────────────────────
    function openStoryPath() {
        if (state.isInGame && !state.isPaused) {
            pauseGame(true);
        }

        var allDiscovered = window.saveManager.getDiscoveredNodes();
        if (storyPathRenderer) {
            storyPathRenderer.setDiscoveredNodes(allDiscovered);
            storyPathRenderer.render();
        }

        showOverlay(dom.overlayStorypath);
    }

    // ── Timers Management ───────────────────────────────────
    function startGameTimers() {
        // Make sure old intervals are gone (loading a save mid-game used to stack them)
        if (playTimeInterval)  { clearInterval(playTimeInterval);  playTimeInterval = null; }
        if (autoSaveInterval)  { clearInterval(autoSaveInterval);  autoSaveInterval = null; }

        // Play time counter
        playTimeInterval = setInterval(function () {
            if (!state.isPaused) {
                state.playTimeSeconds++;
            }
        }, 1000);

        // Auto-save every 2 minutes
        autoSaveInterval = setInterval(function () {
            doAutoSave();
        }, AUTOSAVE_INTERVAL * 1000);
    }

    function stopGameTimers() {
        if (playTimeInterval) {
            clearInterval(playTimeInterval);
            playTimeInterval = null;
        }
        if (autoSaveInterval) {
            clearInterval(autoSaveInterval);
            autoSaveInterval = null;
        }
        clearSceneTimeouts();
        stopDecisionTimer();
    }

    // ── Utility ─────────────────────────────────────────────
    function formatDate(isoStr) {
        if (!isoStr) return '';
        var d = new Date(isoStr);
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
               ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    // ── Quit Handling ───────────────────────────────────────
    function showQuitConfirm() {
        if (state.isInGame && !state.isPaused) {
            pauseGame(true);
        }
        showOverlay(dom.overlayQuit);
    }

    function confirmQuit() {
        hideAllOverlays();
        stopGameTimers();
        state.isInGame = false;
        state.isPaused = false;
        goToMenu();
    }

    function showQuitScreen() {
        // Since this is browser-based, show a "thanks for playing" message
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a;color:#c4a35a;font-family:Creepster,cursive;font-size:2rem;text-align:center;flex-direction:column;">' +
            '<h1 style="font-size:3rem;margin-bottom:1rem;">Thanks for Playing</h1>' +
            '<p style="font-size:1.2rem;color:#888;">THE LAST KNOCK</p>' +
            '<p style="font-size:1rem;color:#666;margin-top:2rem;">You can close this tab now.</p>' +
            '</div>';
    }

    // ── Event Binding ───────────────────────────────────────
    function bindEvents() {
        // Menu buttons
        dom.btnContinue.addEventListener('click', function () {
            if (dom.btnContinue.disabled) return;
            var recent = window.saveManager.getMostRecentSave();
            if (recent) {
                // Find the slot ID of the most recent save
                var slots = window.saveManager.getAllSlots();
                var targetSlot = null;
                for (var i = 0; i < slots.length; i++) {
                    if (!slots[i].isEmpty && slots[i].timestamp === recent.timestamp) {
                        targetSlot = slots[i].slotId;
                        break;
                    }
                }
                if (targetSlot) {
                    loadGame(targetSlot);
                }
            }
        });

        dom.btnNewGame.addEventListener('click', startNewGame);

        dom.btnLoadGame.addEventListener('click', function () {
            openLoadOverlay(true);
        });

        dom.btnStoryPath.addEventListener('click', function () {
            openStoryPath();
        });

        dom.btnQuit.addEventListener('click', showQuitScreen);

        // Game HUD
        dom.hudPause.addEventListener('click', function () { pauseGame(false); });
        dom.hudSave.addEventListener('click', openSaveOverlay);
        dom.hudLoad.addEventListener('click', function () {
            openLoadOverlay(false);
        });
        dom.hudMap.addEventListener('click', openStoryPath);
        dom.hudQuit.addEventListener('click', showQuitConfirm);

        // Choice buttons
        dom.choiceLeft.addEventListener('click', function () {
            makeChoice('left');
        });
        dom.choiceRight.addEventListener('click', function () {
            makeChoice('right');
        });

        // Continue story prompt
        dom.btnContinueStory.addEventListener('click', onContinueStory);

        // Overlay close buttons
        dom.saveClose.addEventListener('click', function () {
            hideOverlay(dom.overlaySave);
            if (state.isInGame) resumeGame();
        });

        dom.loadClose.addEventListener('click', function () {
            hideOverlay(dom.overlayLoad);
            if (state.isInGame && state.isPaused) resumeGame();
        });

        dom.storypathClose.addEventListener('click', function () {
            hideOverlay(dom.overlayStorypath);
            if (state.isInGame && state.isPaused) resumeGame();
        });

        // Pause overlay
        dom.btnResume.addEventListener('click', resumeGame);

        // Quit confirmation
        dom.btnQuitYes.addEventListener('click', confirmQuit);
        dom.btnQuitNo.addEventListener('click', function () {
            hideOverlay(dom.overlayQuit);
            if (state.isInGame && state.isPaused) resumeGame();
        });

        // Game over menu button
        dom.btnGameoverMenu.addEventListener('click', goToMenu);

        // Keyboard shortcuts
        document.addEventListener('keydown', function (e) {
            if (!state.isInGame) {
                if (e.key === 'Escape') {
                    hideOverlay(dom.overlayStorypath);
                    hideOverlay(dom.overlayLoad);
                }
                return;
            }

            switch (e.key) {
                case 'Escape':
                    if (dom.overlaySave.classList.contains('active')) {
                        hideOverlay(dom.overlaySave);
                        if (state.isPaused) resumeGame();
                    } else if (dom.overlayLoad.classList.contains('active')) {
                        hideOverlay(dom.overlayLoad);
                        if (state.isPaused) resumeGame();
                    } else if (dom.overlayStorypath.classList.contains('active')) {
                        hideOverlay(dom.overlayStorypath);
                        if (state.isPaused) resumeGame();
                    } else if (dom.overlayQuit.classList.contains('active')) {
                        hideOverlay(dom.overlayQuit);
                        if (state.isPaused) resumeGame();
                    } else if (state.isPaused) {
                        resumeGame();
                    } else {
                        pauseGame();
                    }
                    break;
                case '1':
                case 'ArrowLeft':
                    if (!state.decisionMade && dom.choicesContainer.style.display !== 'none') {
                        makeChoice('left');
                    }
                    break;
                case '2':
                case 'ArrowRight':
                    if (!state.decisionMade && dom.choicesContainer.style.display !== 'none') {
                        makeChoice('right');
                    }
                    break;
            }
        });
    }

    // ── Initialization ──────────────────────────────────────
    function init() {
        cacheDom();
        bindEvents();

        // Initialize story path renderer
        storyPathRenderer = new window.StoryPathRenderer(dom.storypathTree);

        // Load persistent discovered nodes
        state.discoveredNodes = window.saveManager.getDiscoveredNodes();

        // Play title animation
        playTitleAnimation();
    }

    // ── Boot ────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();