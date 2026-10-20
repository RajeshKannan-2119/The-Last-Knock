# 🌲 The Last Knock — Whispers of the Blackwood

A **decision-based horror story game** built as a Binary Tree, developed for a Data Structures and Algorithms (DSA) course mini-project.

## 📖 About

You are **Alex**, a college student stranded in the infamous **Blackwood Forest** after your car breaks down on a dark autumn night. Every decision you make leads deeper into the horror — and only some paths lead to survival.

The game is powered by a **Binary Tree data structure** with:
- **7 decision nodes** (internal nodes)
- **8 ending nodes** (leaf nodes — 4 Bad Ends + 4 Survivals)
- **15 total nodes** in a complete binary tree

## 🎮 How to Play

1. Open `index.html` in any modern web browser (Chrome, Firefox, Edge, Safari)
2. Watch the title sequence
3. Select **New Game** from the main menu
4. Read the story and make your choices within the **10-second timer**
5. Explore all 8 endings!

### Controls

| Action | How |
|--------|-----|
| Choose Left | Click the left choice or press `←` / `1` |
| Choose Right | Click the right choice or press `→` / `2` |
| Pause/Resume | Click ⏸ button or press `Esc` |
| Save Game | Click 💾 button during gameplay |
| Load Game | Click 📂 button during gameplay |
| Story Path | Click 🗺 button to see the tree |

## 🌳 Binary Tree Structure

```
                    [1] Stranded
                   /             \
          [2] The Beast      [3] The Cabin
          /        \          /          \
    [4] Flee   [5] Climb  [6] Cellar  [7] Upstairs
    /    \      /    \      /    \       /      \
  [8]  [9]  [10] [11]  [12] [13]   [14]   [15]
  Bad  ✅   Bad   ✅    Bad   ✅    Bad     ✅
```

### Endings

| Node | Ending | Type |
|------|--------|------|
| 8 | The Fall (bridge collapse) | ❌ Bad End |
| 9 | Surviving the Thorns | ✅ Survival |
| 10 | The Ambush (tree) | ❌ Bad End |
| 11 | Shadow in the Trees | ✅ Survival |
| 12 | Cornered (cellar) | ❌ Bad End |
| 13 | Escape to the Unknown | ✅ Survival |
| 14 | Last Stand (fight) | ❌ Bad End |
| 15 | The Rooftop Survival | ✅ Survival |

## 💾 Save System

- **5 save slots**: Slot 1 is autosave (every 2 minutes), Slots 2–5 are manual
- Saves persist using browser **localStorage**
- Story Path discovery progress is stored separately and persists across all playthroughs

## 🗺 Story Path

The Story Path visualizes the complete Binary Tree:
- **Unlocked nodes** show scene thumbnails
- **Locked nodes** show 🔒
- Track your exploration progress across multiple playthroughs

## 🛠 Technical Details

### Project Structure

```
The-Last-Knock/
├── index.html              # Main game page
├── css/
│   └── style.css           # Horror-themed styling
├── js/
│   ├── tree.js             # Binary Tree data structure
│   ├── save.js             # Save/Load system (localStorage)
│   ├── storypath.js        # Story Path visualization
│   └── game.js             # Game engine & controller
├── images/                 # All game artwork (18 images)
│   ├── Title_Page.png
│   ├── Node_01_Root_Stranded.png
│   ├── Node_02_Investigation_Beast.png
│   ├── ...
│   └── Node_15_The_Rooftop_Survival_Ending.png
└── README.md               # This file
```

### Technologies Used

- **HTML5** — semantic structure
- **CSS3** — animations, responsive design, horror aesthetic
- **Vanilla JavaScript** — no frameworks or libraries
- **localStorage API** — persistent saves
- **Binary Tree** — core data structure driving the game

### DSA Concepts Demonstrated

1. **Binary Tree Construction** — nodes with left/right children
2. **Tree Traversal** — BFS for path finding and visualization
3. **Path Finding** — root-to-leaf path computation
4. **Node Depth Calculation** — level-based tree layout
5. **State Management** — tracking discovered nodes (sets/arrays)

## 📋 Requirements

- Any modern web browser with JavaScript enabled
- No server, build tools, or installation needed
- Works offline after initial load

## 👥 Credits

- **Story:** Whispers of the Blackwood
- **Art Style:** Anime horror, dark cinematic aesthetic
- **Character:** Alex — 19, college student
- **DSA Course Mini-Project**

---

*"The forest takes anyone who stays outside..."*
