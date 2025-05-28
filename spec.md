# Hanabi Online – Gameplay Specification (v1)

## Game Rules Overview

**Hanabi** (Japanese for "fireworks") is a **cooperative card game** where players work together to build a fireworks display by playing cards in the correct color and number order.  
The twist: **you can see everyone else's cards, but not your own**.

### Objective
Build five fireworks piles (one per color) from **1 to 5**, in ascending order.

### Components
- Cards in 5 colors: Red, Yellow, Green, Blue, White
  - Each color includes:
    - 1 × three copies
    - 2–4 × two copies each
    - 5 × one copy
- 8 blue **clue tokens**
- 3 red **fuse tokens**

### Setup
- 2–3 players: **5 cards each**
- 4–5 players: **4 cards each**
- Hold your hand **facing away from you**

### Turn Options
On your turn, do one of the following:
1. **Give a Clue** (costs 1 blue token):
   - Choose another player.
   - Indicate all cards of a single **number** or **color** in their hand.
2. **Play a Card**:
   - Attempt to add a card to the matching firework pile.
   - Must be the next number in sequence (starting from 1).
   - Invalid play: lose a fuse token.
3. **Discard a Card**:
   - Discard a card to regain 1 clue token (unless already full).

### Fuse Token Loss Conditions
You lose a fuse token if you:
- Play a card that doesn't match the next number for its color
- Play a card in a color that’s already completed
- Play anything other than a 1 when the firework for that color hasn’t started

### Endgame
- Lose all 3 fuse tokens → game ends in failure
- Play all five 5s → game ends in success
- Deck runs out → final round (each player, including last drawer, gets one more turn)

### Scoring
Sum the highest card in each color stack:
- Max score: **25**
- Interpret final score via rating scale (e.g., 20+ = "Legendary Display")

---

## Online Multiplayer Game Design

## Lobby & Game Start
- Players **join via room code**.
- No user accounts; **nickname-only**, chosen once and cannot be changed.
- Game starts when **host clicks "Start Game"**.
- **2–5 players** required to start.
- **Players cannot join** once the game has started.
- If **host disconnects**, another player becomes host.
- If **all players leave** or **30 minutes of inactivity** pass, room is deleted.
- **No spectators**.
- **No moderation filters** (e.g., for nicknames).

---

## Connection Handling
- Players have **5 minutes** to reconnect before the game ends.
- If not reconnected in time, game ends with message:  
  > "Game ended due to player disconnection"
- Players who refresh or lose connection within 5 minutes can **rejoin automatically**.
- **Browser back button** is blocked with an alert to prevent accidental exits.
- No manual **"Leave Game"** button during active gameplay.

---

## Game Setup
- Hands are **randomly dealt** at game start.
- Players see:
  - **Own hand at bottom**
  - Others arranged as:
    - 2 players: top
    - 3 players: left and right
    - 4 players: left, top, right
    - 5 players: arranged around central table
- **No rearranging of hand order**.
- **No note-taking or markings** on cards.

---

## Gameplay Mechanics
### Actions:
- **Play Card**: click directly on a card (confirmation popup shown unless disabled by player)
- **Discard Card**: same as above
- **Give a Clue**:
  - Click "Give Clue"
  - Choose **Color** or **Number**
  - Click a card in another player’s hand
  - All matching cards are **highlighted with animation** before confirmation
  - **Everyone sees** the clue and what kind it was (e.g., “Color Clue”)

### Fuse Tokens:
- Start with **3 red fuse tokens**.
- A **fuse token is lost** when a player plays an **invalid card**, meaning:
  - The card does **not match the next number** in the firework pile of that color.
  - The firework pile for that color is already **completed**.
  - The firework pile for that color **doesn't exist yet** and the card **is not a 1**.
- Game ends immediately if all 3 fuse tokens are lost.

### Clue Tokens:
- Start with **8 blue clue tokens**.
- 1 clue token is **used** when giving a clue.
- 1 clue token is **gained** when discarding a card (unless at max).
- Clue and fuse tokens are always **visible**, with **no special highlights**.

### Other Rules:
- **Players cannot clue themselves**.
- **No clue history** — memory only.
- **Fixed turn order**, with turn indicator visible.
- **No time limits** per turn.
- **Deck is hidden**:
  - When the **last card is drawn**, game **silently proceeds** with one final turn per player.
- **Completed piles** simply stop accepting new cards (no visual indicator).
- **No sound or music**.
- **No visual themes** or accessibility options.
- **No keyboard shortcuts** (mouse/touch only).

---

## Ending the Game
Game ends automatically when:
- All five fireworks piles are **successfully completed (1–5)**
- **3 fuse tokens** are lost
- A **player disconnects** and does not return within **5 minutes**

### Endgame Summary:
- Display final score
- Show sequence of played cards by color
- Option to **Play Again** with same group (reshuffled deck)

---

## Interface & UX
- Own hand always at bottom; others arranged dynamically by player count
- UI shows:
  - **Current player's turn**
  - **Clue and fuse tokens** (static display)
  - **Highlighting animations** when giving clues
  - **Confirmation popup** for Play/Discard, with toggle to disable
- No spectators, chat, or alternate communication
- All data is **ephemeral** (nothing stored after the game ends)
- **Silent error handling** for invalid actions (player may retry)
