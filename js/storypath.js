/**
 * storypath.js — Story Path Visualization
 * 
 * Renders an interactive binary tree (15 nodes: 7 decision + 8 ending leaves)
 * showing the player's exploration progress through "The Last Knock".
 *
 * Binary tree layout (4 levels):
 *   Level 0:                   [1]
 *   Level 1:           [2]             [3]
 *   Level 2:       [4]     [5]     [6]     [7]
 *   Level 3:     [8][9] [10][11] [12][13] [14][15]
 *
 * Exposes: window.StoryPathRenderer
 */

(function () {
  'use strict';

  // ─── Tree Data ──────────────────────────────────────────────────────────────

  /**
   * Static definition of every node in the binary tree.
   * Each entry stores the node id, title, image path, children, and ending type.
   */
  var TREE_NODES = {
    1:  { id: 1,  title: 'Stranded',               image: 'images/Node_01_Root_Stranded.png',              left: 2,  right: 3,  endType: null },
    2:  { id: 2,  title: 'The Beast',               image: 'images/Node_02_Investigation_Beast.png',        left: 4,  right: 5,  endType: null },
    3:  { id: 3,  title: 'The Cabin',               image: 'images/Node_03_Escape_To_Cabin.png',            left: 6,  right: 7,  endType: null },
    4:  { id: 4,  title: 'Flee Through the Forest',  image: 'images/Node_04_Flee_Forest.png',               left: 8,  right: 9,  endType: null },
    5:  { id: 5,  title: 'Up the Oak Tree',          image: 'images/Node_05_Climb_Tree.png',                left: 10, right: 11, endType: null },
    6:  { id: 6,  title: 'The Cellar',               image: 'images/Node_06_Cabin_Cellar.png',              left: 12, right: 13, endType: null },
    7:  { id: 7,  title: 'Upstairs',                 image: 'images/Node_07_Cabin_Upstairs.png',            left: 14, right: 15, endType: null },
    8:  { id: 8,  title: 'The Fall',                  image: 'images/Node_08_Footbridge_Collapse_Ending.png', left: null, right: null, endType: 'bad' },
    9:  { id: 9,  title: 'Surviving the Thorns',      image: 'images/Node_09_Briar_Patch_Survival_Ending.png', left: null, right: null, endType: 'survival' },
    10: { id: 10, title: 'The Ambush',                image: 'images/Node_10_Tree_Ambus_Ending.png',         left: null, right: null, endType: 'bad' },
    11: { id: 11, title: 'Shadow in the Trees',       image: 'images/Node_11_Vine_Crawl_Survival_Ending.png', left: null, right: null, endType: 'survival' },
    12: { id: 12, title: 'Cornered',                  image: 'images/Node_12_Cellar_Cornered_Ending.png',    left: null, right: null, endType: 'bad' },
    13: { id: 13, title: 'Escape to the Unknown',     image: 'images/Node_13_Coal_Chute_Escape_Ending.png',  left: null, right: null, endType: 'survival' },
    14: { id: 14, title: 'Last Stand',                image: 'images/Node_14_Fight_The_Beast_Ending.png',    left: null, right: null, endType: 'bad' },
    15: { id: 15, title: 'The Rooftop Survival',      image: 'images/Node_15_The_Rooftop_Survival_Ending.png', left: null, right: null, endType: 'survival' }
  };

  /** Parent→child edges used to draw connector lines. */
  var EDGES = [
    { from: 1,  to: 2 },  { from: 1,  to: 3 },
    { from: 2,  to: 4 },  { from: 2,  to: 5 },
    { from: 3,  to: 6 },  { from: 3,  to: 7 },
    { from: 4,  to: 8 },  { from: 4,  to: 9 },
    { from: 5,  to: 10 }, { from: 5,  to: 11 },
    { from: 6,  to: 12 }, { from: 6,  to: 13 },
    { from: 7,  to: 14 }, { from: 7,  to: 15 }
  ];

  // ─── Layout Constants ───────────────────────────────────────────────────────

  var NODE_WIDTH   = 110;   // px — card width
  var NODE_HEIGHT  = 90;    // px — card height
  var LEVEL_GAP_Y  = 100;   // vertical gap between levels
  var TOP_PADDING  = 80;    // space above root for the header / counter
  var BOTTOM_PADDING = 40;  // space below the last level

  // ─── Colours ────────────────────────────────────────────────────────────────

  var COLOR_BG             = '#0d0d0d';
  var COLOR_CARD_BG        = '#1a1a1a';
  var COLOR_CARD_BORDER    = '#333';
  var COLOR_LOCKED_TEXT    = '#555';
  var COLOR_TITLE_TEXT     = '#c8c8c8';
  var COLOR_DISCOVERED_LINE = '#c9a84c'; // golden
  var COLOR_LOCKED_LINE     = '#2a2a2a'; // dim gray
  var COLOR_BAD_BORDER      = '#a82020'; // red tint
  var COLOR_SURVIVAL_BORDER = '#20a848'; // green tint
  var COLOR_COUNTER_TEXT    = '#e0d6b8';
  var COLOR_LEGEND_TEXT     = '#888';

  // ─── Helper: create a DOM element with inline styles ────────────────────────

  /**
   * Shorthand to create an element, apply inline styles, and optionally set
   * textContent or innerHTML.
   */
  function createElement(tag, styles, textContent) {
    var el = document.createElement(tag);
    if (styles) {
      for (var prop in styles) {
        if (styles.hasOwnProperty(prop)) {
          el.style[prop] = styles[prop];
        }
      }
    }
    if (textContent !== undefined) {
      el.textContent = textContent;
    }
    return el;
  }

  // ─── StoryPathRenderer Constructor ──────────────────────────────────────────

  /**
   * @constructor
   * @param {HTMLElement} containerElement — the DOM element to render inside
   *   (expected to have id 'storypath-tree').
   */
  function StoryPathRenderer(containerElement) {
    /** @type {HTMLElement} */
    this.container = containerElement;

    /** Set of node ids the player has discovered. */
    this.discoveredSet = {};

    /** Map of node id → positioned DOM card element (for line drawing). */
    this._cardElements = {};

    /** Internal flag: has render() been called at least once? */
    this._rendered = false;
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Set which nodes are discovered.
   * @param {number[]} nodeIdsArray — array of discovered node ids
   */
  StoryPathRenderer.prototype.setDiscoveredNodes = function (nodeIdsArray) {
    this.discoveredSet = {};
    for (var i = 0; i < nodeIdsArray.length; i++) {
      this.discoveredSet[nodeIdsArray[i]] = true;
    }
  };

  /**
   * Build (or rebuild) the entire tree visualisation inside the container.
   */
  StoryPathRenderer.prototype.render = function () {
    // Clear previous content
    this.container.innerHTML = '';
    this._cardElements = {};

    // Apply container styles (full-screen overlay, scrollable)
    this._applyContainerStyles();

    // Scroll wrapper — a flex box, so the stage below can be centred with
    // margin:auto in BOTH directions (and still scrolls if it ever overflows).
    var scrollWrapper = createElement('div', {
      width: '100%',
      height: '100%',
      display: 'flex',
      overflow: 'auto',
      position: 'relative',
      boxSizing: 'border-box'
    });
    this.container.appendChild(scrollWrapper);

    // Calculate the required canvas dimensions
    var levelWidths = this._computeLevelWidths();
    var canvasWidth  = Math.max(levelWidths[3], 900); // at least 900px
    var canvasHeight = TOP_PADDING + 4 * NODE_HEIGHT + 3 * LEVEL_GAP_Y + BOTTOM_PADDING;

    // Scale the whole tree down (never up) so it fits the screen with a margin
    var margin = 24;
    var scale = Math.min(
      1,
      (window.innerWidth  - margin * 2) / canvasWidth,
      (window.innerHeight - margin * 2) / canvasHeight
    );
    scale = Math.max(scale, 0.45);   // below this the cards get unreadable; scroll instead

    // Stage — takes the SCALED size and is centred by margin:auto
    var stage = createElement('div', {
      position: 'relative',
      flex: 'none',
      margin: 'auto',
      width: Math.round(canvasWidth * scale) + 'px',
      height: Math.round(canvasHeight * scale) + 'px'
    });
    scrollWrapper.appendChild(stage);

    // Canvas — laid out at full size, then scaled from its top-left corner
    var canvas = createElement('div', {
      position: 'absolute',
      top: '0',
      left: '0',
      width: canvasWidth + 'px',
      height: canvasHeight + 'px',
      transform: 'scale(' + scale + ')',
      transformOrigin: '0 0',
      boxSizing: 'border-box'
    });
    stage.appendChild(canvas);

    // Re-fit when the window size changes while the Story Path is open
    if (!this._resizeBound) {
      var self = this;
      this._resizeBound = true;
      window.addEventListener('resize', function () {
        if (self._rendered && self.container.offsetParent !== null) self.render();
      });
    }

    // ── Header: discovery counter ──
    this._renderHeader(canvas, canvasWidth);

    // ── Compute node positions ──
    var positions = this._computeNodePositions(canvasWidth, canvasHeight);

    // ── SVG overlay for connector lines ──
    this._renderLines(canvas, positions, canvasWidth, canvasHeight);

    // ── Render node cards ──
    this._renderCards(canvas, positions);

    // ── Legend ──
    this._renderLegend(canvas, canvasWidth, canvasHeight);

    this._rendered = true;
  };

  /**
   * Make the overlay visible.
   */
  StoryPathRenderer.prototype.show = function () {
    this.container.style.display = 'flex';
  };

  /**
   * Hide the overlay.
   */
  StoryPathRenderer.prototype.hide = function () {
    this.container.style.display = 'none';
  };

  // ─── Internal: Container Styles ─────────────────────────────────────────────

  StoryPathRenderer.prototype._applyContainerStyles = function () {
    var s = this.container.style;
    s.position   = 'fixed';
    s.top        = '0';
    s.left       = '0';
    s.width      = '100%';
    s.height     = '100%';
    s.background = COLOR_BG;
    s.zIndex     = '9000';
    s.display    = 'flex';
    s.flexDirection = 'column';
    s.alignItems = 'stretch';
    s.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    s.color      = COLOR_TITLE_TEXT;
    s.boxSizing  = 'border-box';
  };

  // ─── Internal: Compute Level Widths ─────────────────────────────────────────

  /**
   * Returns an array of 4 pixel widths — the minimum width needed at each level
   * to lay out nodes with comfortable spacing.
   */
  StoryPathRenderer.prototype._computeLevelWidths = function () {
    // Nodes per level: 1, 2, 4, 8
    var nodesPerLevel = [1, 2, 4, 8];
    var gap = 20; // horizontal gap between sibling cards
    var widths = [];
    for (var i = 0; i < nodesPerLevel.length; i++) {
      widths.push(nodesPerLevel[i] * NODE_WIDTH + (nodesPerLevel[i] - 1) * gap + 60);
    }
    return widths;
  };

  // ─── Internal: Compute Node Positions ───────────────────────────────────────

  /**
   * Assigns (x, y) center coordinates to every node based on a balanced
   * binary tree layout.  Returns an object: { nodeId: { x, y } }
   */
  StoryPathRenderer.prototype._computeNodePositions = function (canvasWidth /*, canvasHeight */) {
    var positions = {};

    // Level definitions — which node ids live at each depth
    var levels = [
      [1],
      [2, 3],
      [4, 5, 6, 7],
      [8, 9, 10, 11, 12, 13, 14, 15]
    ];

    for (var depth = 0; depth < levels.length; depth++) {
      var nodesAtLevel = levels[depth];
      var count = nodesAtLevel.length;

      // Y position: top padding + level offset
      var y = TOP_PADDING + depth * (NODE_HEIGHT + LEVEL_GAP_Y) + NODE_HEIGHT / 2;

      // Spread nodes evenly across the canvas width
      for (var i = 0; i < count; i++) {
        var slotWidth = canvasWidth / count;
        var x = slotWidth * i + slotWidth / 2;
        positions[nodesAtLevel[i]] = { x: x, y: y };
      }
    }

    return positions;
  };

  // ─── Internal: Render Header (Counter) ──────────────────────────────────────

  StoryPathRenderer.prototype._renderHeader = function (canvas, canvasWidth) {
    var discoveredCount = 0;
    for (var id in TREE_NODES) {
      if (this.discoveredSet[id]) discoveredCount++;
    }

    var header = createElement('div', {
      position: 'absolute',
      top: '10px',
      left: '0',
      width: '100%',
      textAlign: 'center',
      fontSize: '20px',
      fontWeight: 'bold',
      color: COLOR_COUNTER_TEXT,
      letterSpacing: '1px',
      textShadow: '0 0 8px rgba(201,168,76,0.4)',
      zIndex: '10',
      pointerEvents: 'none'
    });

    header.innerHTML = '🗺️ Story Path &nbsp;&mdash;&nbsp; ' +
      '<span style="color:#c9a84c">' + discoveredCount + '</span>' +
      ' / 15 discovered';

    canvas.appendChild(header);
  };

  // ─── Internal: Render SVG Lines ─────────────────────────────────────────────

  /**
   * Creates an absolutely-positioned SVG element that draws lines from each
   * parent node to its children.
   */
  StoryPathRenderer.prototype._renderLines = function (canvas, positions, w, h) {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', w);
    svg.setAttribute('height', h);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    for (var i = 0; i < EDGES.length; i++) {
      var edge = EDGES[i];
      var fromPos = positions[edge.from];
      var toPos   = positions[edge.to];

      // A line is "discovered" only when BOTH endpoints are discovered
      var isDiscovered = !!(this.discoveredSet[edge.from] && this.discoveredSet[edge.to]);
      var lineColor = isDiscovered ? COLOR_DISCOVERED_LINE : COLOR_LOCKED_LINE;
      var lineWidth = isDiscovered ? 2.5 : 1.5;
      var lineOpacity = isDiscovered ? 1 : 0.5;

      var line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', fromPos.x);
      line.setAttribute('y1', fromPos.y + NODE_HEIGHT / 2); // bottom of parent
      line.setAttribute('x2', toPos.x);
      line.setAttribute('y2', toPos.y - NODE_HEIGHT / 2);   // top of child
      line.setAttribute('stroke', lineColor);
      line.setAttribute('stroke-width', lineWidth);
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', lineOpacity);

      // Discovered lines get a subtle glow
      if (isDiscovered) {
        var filterId = 'glow-' + edge.from + '-' + edge.to;
        var defs = svg.querySelector('defs') || (function () {
          var d = document.createElementNS(svgNS, 'defs');
          svg.insertBefore(d, svg.firstChild);
          return d;
        })();
        var filter = document.createElementNS(svgNS, 'filter');
        filter.setAttribute('id', filterId);
        var feGaussian = document.createElementNS(svgNS, 'feGaussianBlur');
        feGaussian.setAttribute('stdDeviation', '2.5');
        feGaussian.setAttribute('result', 'coloredBlur');
        filter.appendChild(feGaussian);
        var feMerge = document.createElementNS(svgNS, 'feMerge');
        var feMergeNode1 = document.createElementNS(svgNS, 'feMergeNode');
        feMergeNode1.setAttribute('in', 'coloredBlur');
        var feMergeNode2 = document.createElementNS(svgNS, 'feMergeNode');
        feMergeNode2.setAttribute('in', 'SourceGraphic');
        feMerge.appendChild(feMergeNode1);
        feMerge.appendChild(feMergeNode2);
        filter.appendChild(feMerge);
        defs.appendChild(filter);

        line.setAttribute('filter', 'url(#' + filterId + ')');
      }

      svg.appendChild(line);
    }

    canvas.appendChild(svg);
  };

  // ─── Internal: Render Node Cards ────────────────────────────────────────────

  /**
   * Creates a positioned card element for every node in the tree.
   */
  StoryPathRenderer.prototype._renderCards = function (canvas, positions) {
    for (var id in TREE_NODES) {
      if (!TREE_NODES.hasOwnProperty(id)) continue;
      var node = TREE_NODES[id];
      var pos  = positions[id];
      var isDiscovered = !!this.discoveredSet[id];

      // ── Card wrapper ──
      var card = createElement('div', {
        position: 'absolute',
        left: (pos.x - NODE_WIDTH / 2) + 'px',
        top:  (pos.y - NODE_HEIGHT / 2) + 'px',
        width: NODE_WIDTH + 'px',
        height: NODE_HEIGHT + 'px',
        background: isDiscovered ? COLOR_CARD_BG : '#111',
        border: '2px solid ' + this._cardBorderColor(node, isDiscovered),
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'default',
        zIndex: '5',
        transition: 'box-shadow 0.3s',
        boxShadow: isDiscovered
          ? '0 0 10px rgba(201,168,76,0.15)'
          : 'none'
      });

      // Hover glow for discovered cards
      if (isDiscovered) {
        (function (cardEl, borderColor) {
          cardEl.addEventListener('mouseenter', function () {
            cardEl.style.boxShadow = '0 0 16px ' + borderColor + '66';
          });
          cardEl.addEventListener('mouseleave', function () {
            cardEl.style.boxShadow = '0 0 10px rgba(201,168,76,0.15)';
          });
        })(card, this._cardBorderColor(node, true));
      }

      if (isDiscovered) {
        // ── Discovered: show thumbnail + title ──
        // Wrapper crops the thumbnail: the artwork has a text panel baked into its
        // bottom ~21%, so the image is enlarged and anchored to the top.
        var thumbBox = createElement('div', {
          width: '100%',
          height: '55px',
          overflow: 'hidden',
          flex: 'none',
          borderBottom: '1px solid ' + COLOR_CARD_BORDER,
          pointerEvents: 'none'
        });
        var thumb = createElement('img', {
          display: 'block',
          width: '125%',
          maxWidth: 'none',
          marginLeft: '-12.5%',
          height: 'auto',
          imageRendering: 'auto'
        });
        thumb.src = node.image;
        thumb.alt = node.title;
        thumbBox.appendChild(thumb);
        card.appendChild(thumbBox);

        var title = createElement('div', {
          fontSize: '10px',
          fontWeight: '600',
          color: COLOR_TITLE_TEXT,
          textAlign: 'center',
          padding: '3px 4px 2px',
          lineHeight: '1.2',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
          boxSizing: 'border-box'
        }, node.title);
        card.appendChild(title);

        // Ending badge
        if (node.endType) {
          var badge = createElement('div', {
            fontSize: '9px',
            fontWeight: 'bold',
            color: node.endType === 'bad' ? COLOR_BAD_BORDER : COLOR_SURVIVAL_BORDER,
            textAlign: 'center',
            lineHeight: '1',
            paddingBottom: '2px'
          }, node.endType === 'bad' ? '💀 Bad End' : '✅ Survival');
          card.appendChild(badge);
        }
      } else {
        // ── Locked: show lock icon + '???' ──
        var lockIcon = createElement('div', {
          fontSize: '26px',
          lineHeight: '1',
          marginBottom: '4px',
          opacity: '0.4',
          userSelect: 'none'
        }, '🔒');
        card.appendChild(lockIcon);

        var mystery = createElement('div', {
          fontSize: '12px',
          color: COLOR_LOCKED_TEXT,
          fontStyle: 'italic',
          letterSpacing: '2px'
        }, '???');
        card.appendChild(mystery);
      }

      canvas.appendChild(card);
      this._cardElements[id] = card;
    }
  };

  /**
   * Returns the appropriate border colour for a card based on its ending type
   * and discovery state.
   */
  StoryPathRenderer.prototype._cardBorderColor = function (node, isDiscovered) {
    if (!isDiscovered) return '#222';
    if (node.endType === 'bad')      return COLOR_BAD_BORDER;
    if (node.endType === 'survival') return COLOR_SURVIVAL_BORDER;
    return COLOR_CARD_BORDER;
  };

  // ─── Internal: Render Legend ────────────────────────────────────────────────

  StoryPathRenderer.prototype._renderLegend = function (canvas, canvasWidth, canvasHeight) {
    var legend = createElement('div', {
      position: 'absolute',
      bottom: '8px',
      left: '0',
      width: '100%',
      textAlign: 'center',
      fontSize: '13px',
      color: COLOR_LEGEND_TEXT,
      zIndex: '10',
      pointerEvents: 'none',
      letterSpacing: '0.5px'
    });

    legend.innerHTML =
      '<span style="margin-right:24px">🔒 Locked</span>' +
      '<span style="margin-right:24px">💀 Bad End</span>' +
      '<span>✅ Survival</span>';

    canvas.appendChild(legend);
  };

  // ─── Expose on window ──────────────────────────────────────────────────────

  window.StoryPathRenderer = StoryPathRenderer;

})();