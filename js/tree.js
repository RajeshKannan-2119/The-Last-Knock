/* ============================================================
 *  tree.js — Binary Tree Data Structure for "The Last Knock"
 *  
 *  Implements a proper Binary Tree with 15 nodes:
 *    - 7 internal decision nodes (Levels 0–2)
 *    - 8 leaf ending nodes     (Level 3)
 *    - 1 special timeout node  (Node 0, outside the tree)
 *
 *  Public API exposed on window:
 *    window.StoryNode   — constructor
 *    window.BinaryTree  — constructor
 *    window.storyTree   — the fully-built tree instance
 * ============================================================ */

// ── StoryNode ───────────────────────────────────────────────
function StoryNode(id, title, storyText, image, options) {
    options = options || {};
    this.id             = id;
    this.title          = title;
    this.storyText      = storyText;
    this.image          = 'images/' + image;
    this.isEnding       = options.isEnding    || false;
    this.endingType     = options.endingType   || null;   // 'bad' | 'survival'
    this.endingTitle    = options.endingTitle  || null;
    this.left           = null;   // left child  (StoryNode)
    this.right          = null;   // right child (StoryNode)
    this.leftChoiceText = options.leftChoice   || '';
    this.rightChoiceText= options.rightChoice  || '';
}

// ── BinaryTree ──────────────────────────────────────────────
function BinaryTree() {
    this.root        = null;
    this.nodes       = {};      // id → StoryNode
    this.timeoutNode = null;    // special Node 0
}

BinaryTree.prototype.addNode = function (node) {
    this.nodes[node.id] = node;
};

BinaryTree.prototype.getNode = function (id) {
    return this.nodes[id] || null;
};

BinaryTree.prototype.getTimeoutNode = function () {
    return this.timeoutNode;
};

BinaryTree.prototype.getAllNodeIds = function () {
    // Returns only the 15 tree-node IDs (excludes timeout 0)
    return Object.keys(this.nodes)
        .map(Number)
        .filter(function (id) { return id !== 0; });
};

BinaryTree.prototype.getRoot = function () {
    return this.root;
};

/** Return array of node IDs from root → target (BFS path). */
BinaryTree.prototype.getPathToNode = function (targetId) {
    if (targetId === this.root.id) return [this.root.id];

    var queue = [[this.root, [this.root.id]]];
    while (queue.length) {
        var pair = queue.shift();
        var node = pair[0];
        var path = pair[1];

        if (node.left) {
            var lp = path.concat(node.left.id);
            if (node.left.id === targetId) return lp;
            queue.push([node.left, lp]);
        }
        if (node.right) {
            var rp = path.concat(node.right.id);
            if (node.right.id === targetId) return rp;
            queue.push([node.right, rp]);
        }
    }
    return [];
};

/** BFS traversal — returns nodes level by level. */
BinaryTree.prototype.bfs = function () {
    var result = [];
    var queue  = [this.root];
    while (queue.length) {
        var node = queue.shift();
        if (!node) continue;
        result.push(node);
        queue.push(node.left);
        queue.push(node.right);
    }
    return result;
};

/** Return the depth (0-based) of a node in the tree. */
BinaryTree.prototype.getDepth = function (nodeId) {
    var path = this.getPathToNode(nodeId);
    return path.length ? path.length - 1 : -1;
};

// ── Build the Story Tree ────────────────────────────────────
function buildStoryTree() {
    var tree = new BinaryTree();

    /* ---- Node 0: Timeout Death (special, not part of tree) ---- */
    var n0 = new StoryNode(0, 'Time Is Up',
        'Frozen in fear, you hesitated for too long. The darkness in the woods catches up to you\u2026',
        'Node_00_Timeout_Death.png',
        { isEnding: true, endingType: 'bad', endingTitle: 'Timeout Death' });
    tree.timeoutNode = n0;
    tree.addNode(n0);

    /* ================= LEVEL 0 — ROOT ================= */

    var n1 = new StoryNode(1, 'Stranded',
        'You are Alex, a college student who took a wrong turn on an autumnal night driving through the infamous Blackwood forest. Your car engine abruptly dies, and smoke rises from the hood. The night is pitch black, and the signal on your phone is completely gone. In the distance, you see the faint, flickering glow of a cabin. Nearer to you, you hear a strange, rustling, and heavy breathing sound coming from the deep woods directly behind your vehicle.',
        'Node_01_Root_Stranded.png',
        {
            leftChoice:  'Search the glove box for a flashlight and investigate the forest noise.',
            rightChoice: 'Abandon the car immediately and run toward the distant glowing cabin.'
        });

    /* ================= LEVEL 1 ================= */

    var n2 = new StoryNode(2, 'The Beast',
        'With flashlight in hand, you step toward the tree line. The beams catch a horrific sight: a towering, skeletal creature with hollow eyes\u2014a Wendigo-like figure\u2014eating a carcass. It snaps its head toward you, its eyes locking onto yours. It lets out an ear-piercing screech.',
        'Node_02_Investigation_Beast.png',
        {
            leftChoice:  'Scream and flee frantically back down the dark, unlit forest trail.',
            rightChoice: 'Climb a large, nearby oak tree to hide in the dense upper branches.'
        });

    var n3 = new StoryNode(3, 'The Cabin',
        'You sprint through the brush toward the cabin. You reach the porch, panting, and try the handle\u2014it\u2019s unlocked. Behind you, the sound of snapping branches grows closer. Inside, you see a dimly lit hallway with a trapdoor leading to a cellar, and a staircase leading upstairs, where a shadow just moved.',
        'Node_03_Escape_To_Cabin.png',
        {
            leftChoice:  'Go down the dark stairs into the cellar to hide.',
            rightChoice: 'Head upstairs toward the room where you saw the shadow.'
        });

    /* ================= LEVEL 2 ================= */

    var n4 = new StoryNode(4, 'Flee Through the Forest',
        'You run blindly down the dark trail. You hear heavy, animalistic thuds rapidly gaining on you. Up ahead, you see an old, rickety footbridge over a deep ravine, but you also spot a dense, thorny briar patch you might be able to scramble into to lose your pursuer.',
        'Node_04_Flee_Forest.png',
        {
            leftChoice:  'Attempt to cross the rotting footbridge.',
            rightChoice: 'Jump into the thorny briar patch to hide.'
        });

    var n5 = new StoryNode(5, 'Up the Oak Tree',
        'You scramble up the oak tree. The creature rushes to the base, sniffing furiously. It begins pacing, looking upward. You hold your breath, but your hand slips, snapping a small branch. Suddenly, you hear a distant car horn on the road, which briefly distracts the beast, but you also notice a thick, vine-covered branch that could let you crawl to an adjacent tree.',
        'Node_05_Climb_Tree.png',
        {
            leftChoice:  'Stay absolutely still and hope the noise draws the creature away.',
            rightChoice: 'Try to quietly crawl across the vine-covered branch to the next tree.'
        });

    var n6 = new StoryNode(6, 'The Cellar',
        'You pull the trapdoor shut behind you in the dark, dusty cellar. You find yourself surrounded by old tools and jars. Footsteps begin heavy and loud on the floorboards directly above you. You see a rusted shovel on the floor and a small, dirty coal chute window that leads outside.',
        'Node_06_Cabin_Cellar.png',
        {
            leftChoice:  'Grab the shovel to prepare to fight whatever is upstairs if it comes down.',
            rightChoice: 'Try to squeeze through the small coal chute window to escape back outside.'
        });

    var n7 = new StoryNode(7, 'Upstairs',
        'You cautiously climb the creaking stairs. In a room at the end of the hall, you find an elderly, terrified man holding a shotgun. He tells you the \u201Cforest takes anyone who stays outside.\u201D Suddenly, the front door downstairs crashes open with a roar. The monster has entered the cabin.',
        'Node_07_Cabin_Upstairs.png',
        {
            leftChoice:  'Urge the old man to fight and back him up.',
            rightChoice: 'Slip out through a nearby second-story window onto the roof.'
        });

    /* ================= LEVEL 3 — ENDINGS (Leaves) ================= */

    var n8 = new StoryNode(8, 'The Fall',
        'The decaying bridge gives way under your weight. You fall into the dark ravine below.',
        'Node_08_Footbridge_Collapse_Ending.png',
        { isEnding: true, endingType: 'bad', endingTitle: 'Ending A — The Fall' });

    var n9 = new StoryNode(9, 'Surviving the Thorns',
        'The beast ignores the thorns and rushes past. You are badly scratched, but you manage to survive the night and find the highway at dawn.',
        'Node_09_Briar_Patch_Survival_Ending.png',
        { isEnding: true, endingType: 'survival', endingTitle: 'Ending B — Surviving the Thorns' });

    var n10 = new StoryNode(10, 'The Ambush',
        'The distraction fails; the creature looks up, spots you, and easily climbs the tree.',
        'Node_10_Tree_Ambus_Ending.png',
        { isEnding: true, endingType: 'bad', endingTitle: 'Ending C — The Ambush' });

    var n11 = new StoryNode(11, 'Shadow in the Trees',
        'The branch holds! You safely navigate the canopy, waiting out the night high above the forest floor until daylight arrives.',
        'Node_11_Vine_Crawl_Survival_Ending.png',
        { isEnding: true, endingType: 'survival', endingTitle: 'Ending D — Shadow in the Trees' });

    var n12 = new StoryNode(12, 'Cornered',
        'The door is smashed open. You swing the shovel, but the monster is too powerful in the confined space.',
        'Node_12_Cellar_Cornered_Ending.png',
        { isEnding: true, endingType: 'bad', endingTitle: 'Ending E — Cornered' });

    var n13 = new StoryNode(13, 'Escape to the Unknown',
        'You squeeze through just as the creature enters the cellar. You run into the night, eventually flag down a passing police car, and escape.',
        'Node_13_Coal_Chute_Escape_Ending.png',
        { isEnding: true, endingType: 'survival', endingTitle: 'Ending F — Escape to the Unknown' });

    var n14 = new StoryNode(14, 'Last Stand',
        'The old man fires, wounding the beast, but it overpowers him. Without a weapon, you are next.',
        'Node_14_Fight_The_Beast_Ending.png',
        { isEnding: true, endingType: 'bad', endingTitle: 'Ending G — Last Stand' });

    var n15 = new StoryNode(15, 'The Rooftop Survival',
        'You leap onto the roof and slide down to the ground. You hear the struggle inside as you run to the road, escaping into the night.',
        'Node_15_The_Rooftop_Survival_Ending.png',
        { isEnding: true, endingType: 'survival', endingTitle: 'Ending H — The Rooftop Survival' });

    /* ---- Wire up the tree edges ---- */
    n1.left  = n2;   n1.right  = n3;
    n2.left  = n4;   n2.right  = n5;
    n3.left  = n6;   n3.right  = n7;
    n4.left  = n8;   n4.right  = n9;
    n5.left  = n10;  n5.right  = n11;
    n6.left  = n12;  n6.right  = n13;
    n7.left  = n14;  n7.right  = n15;

    /* ---- Register all nodes ---- */
    var all = [n1, n2, n3, n4, n5, n6, n7, n8, n9, n10, n11, n12, n13, n14, n15];
    for (var i = 0; i < all.length; i++) {
        tree.addNode(all[i]);
    }

    tree.root = n1;
    return tree;
}

// ── Expose globally ─────────────────────────────────────────
window.StoryNode  = StoryNode;
window.BinaryTree = BinaryTree;
window.storyTree  = buildStoryTree();