# Clue Visualization Testing Guide

## Overview
This guide tests the enhanced clue visualization system where clue recipients see visual changes to their cards, and other players see highlighted cards showing what was clued.

## Test Setup
1. Start server: `node server.js`
2. Open browser to `http://localhost:3000`
3. Create a room with 3 players for optimal testing
4. Start the game

## Expected Behavior Summary

### For Clue Recipients (Target Player):
- **Number Clues**: Hidden cards show the number in a blue circle, background changes to light blue
- **Color Clues**: Hidden cards keep "?" but background changes to match the color hint
- **Confirmation**: Modal overlay appears for ALL players (no dimmed background)
- **After Confirmation**: Cards return to black with "?" (normal hidden state)

### For Other Players (Observers):
- **All Clues**: See green pulsing border on the clued cards
- **Persistent**: Highlighting remains until any player confirms
- **Clear View**: Can see exactly which cards were affected
- **Confirmation**: Same modal appears for all players to see the clue information

### Modal Behavior:
- **Position**: Top-right corner (not full-screen overlay)
- **Background**: Semi-transparent white with blue border (no dimming)
- **Visibility**: Cards and game board remain fully visible
- **Appears For**: All players EXCEPT the clue giver
- **Text**: Different for recipient vs observers
- **Button**: Any player (except giver) can click to continue the game
- **Game State**: All action buttons and card interactions are DISABLED until modal is dismissed
- **Keyboard Shortcuts**: Disabled while modal is active

## Detailed Test Cases

### Test 1: Number Clue Visualization

**Setup**: Player A gives Player B a "number 3" clue

**Expected Results for Player B (recipient):**
1. Cards matching number 3 should:
   - Remove black background and "?" text
   - Show light blue background (white to light blue gradient)
   - Display blue circle with "3" in the center
   - Show blue border
   - Tooltip: "Your card - Number 3"

2. Cards NOT matching number 3 should:
   - Remain black with "?" (unchanged)
   - Normal tooltip: "Your card (hidden)"

3. Confirmation overlay should appear:
   - Text: "Player A gave you a number 3 clue. Check your cards to see which ones match!"
   - Button: "Got it! Continue Game"

**Expected Results for Player C (observer):**
1. Player B's cards matching number 3 should:
   - Show green pulsing border animation
   - Keep original card appearance (color and number visible)

2. Other cards should remain unchanged

3. Confirmation overlay should appear:
   - Text: "Player A gave Player B a number 3 clue. Look at the highlighted cards!"
   - Button: "Continue Game"

**Expected Results for Player A (clue giver):**
1. No confirmation modal appears (they know they just gave a clue)
2. Can see the clue visualization on Player B's cards briefly
3. Highlighting clears automatically after ~100ms
4. Game continues normally for them

**After ANY player (except Player A) clicks the continue button:**
1. All Player B's cards return to black with "?"
2. Green highlighting disappears from observer view
3. Overlay closes for all players
4. Game continues normally

### Test 2: Color Clue Visualization

**Setup**: Player B gives Player C a "red color" clue

**Expected Results for Player C (recipient):**
1. Cards matching red color should:
   - Remove black background but keep "?" text
   - Show light red background (light pink gradient)
   - Show red border
   - Tooltip: "Your card - red color"

2. Cards NOT matching red should:
   - Remain black with "?" (unchanged)

3. Confirmation overlay should appear:
   - Text: "Player B gave you a red color clue. Check your cards to see which ones match!"

**Expected Results for Players A & B (observers):**
1. Player C's red cards should show green pulsing border
2. Other cards remain unchanged
3. Confirmation overlay should appear:
   - Text: "Player B gave Player C a red color clue. Look at the highlighted cards!"
   - Button: "Continue Game"

**Expected Results for Player B (clue giver):**
1. No confirmation modal appears (they know they just gave a clue)
2. Can see the clue visualization on Player C's cards briefly
3. Highlighting clears automatically after ~100ms
4. Game continues normally for them

**After any player (except Player B) confirms:**
1. All cards return to normal hidden state
2. Highlighting clears for all players
3. Overlay closes for all players
4. Game continues

### Test 3: Multiple Color Clues

Test each color individually:
- **Red clue**: Light red/pink background
- **Yellow clue**: Light yellow background  
- **Green clue**: Light green background
- **Blue clue**: Light blue background
- **White clue**: Light gray background

### Test 4: Edge Cases

**Multiple Cards Matching:**
- Give a clue that matches 2-3 cards
- Verify all matching cards show visualization
- Verify non-matching cards remain unchanged

**Single Card Matching:**
- Give a clue that matches only 1 card
- Verify only that card shows visualization

**No Cards Matching:**
- This shouldn't happen due to game rules, but if it does, no cards should change

### Test 5: Interaction During Clue Visualization

**While clue visualization is active:**
1. All action buttons should be disabled and visually dimmed
2. All cards should be non-interactive (pointer-events disabled)
3. Keyboard shortcuts (P, D, C, Escape) should not work
4. Only the "Continue Game" button in the modal should be clickable
5. Game should be completely paused until confirmation

**Test Steps:**
1. Give a clue to trigger the modal
2. Try clicking action buttons - should not respond
3. Try clicking on cards - should not respond  
4. Try keyboard shortcuts - should not work
5. Click "Continue Game" - everything should re-enable

### Test 6: Visual Quality Check

**Number Clue Cards Should Show:**
- Clear blue circle with white number
- Light blue background gradient
- Blue border
- No "?" text visible

**Color Clue Cards Should Show:**
- "?" text still visible
- Background color matching the clue color
- Colored border matching the clue
- Clear visual distinction from hidden cards

**Observer Highlighting Should Show:**
- Green pulsing border animation
- Clear visibility of which cards were clued
- No interference with card readability

## Step-by-Step Testing Procedure

### Phase 1: Basic Number Clue
1. **Player 1's turn**: Give Player 2 a number clue
   - Click "Give Clue" → "By Number" → Click on a card with number "2"
   - **Check Player 2's screen**: Cards with 2 should show blue circle with "2"
   - **Check Player 3's screen**: Player 2's matching cards should have green border
   - **Check Player 1 (giver)**: NO modal should appear, highlighting clears automatically
   - **Check Players 2&3**: Confirmation modal should appear in top-right corner
     - Player 2 sees: "Player 1 gave you a number 2 clue. Check your cards to see which ones match!"
     - Player 3 sees: "Player 1 gave Player 2 a number 2 clue. Look at the highlighted cards!"

2. **Player 2 OR Player 3**: Click "Continue Game" button
   - **Check all screens**: Visualization should clear, cards return to black "?"
   - **Check all screens**: Modal disappears for everyone

### Phase 2: Basic Color Clue
1. **Player 2's turn**: Give Player 3 a color clue
   - Click "Give Clue" → "By Color" → Click on a red card
   - **Check Player 3's screen**: Red cards should show light red background with "?"
   - **Check Player 1**: Player 3's red cards should have green border
   - **Check Player 2 (giver)**: NO modal should appear, highlighting clears automatically
   - **Check Players 1&3**: Confirmation modal should appear
     - Player 3 sees: "Player 2 gave you a red color clue. Check your cards to see which ones match!"
     - Player 1 sees: "Player 2 gave Player 3 a red color clue. Look at the highlighted cards!"

2. **Player 1 OR Player 3**: Click "Continue Game" button
   - **Check all screens**: Visualization should clear for everyone

### Phase 3: Comprehensive Color Testing
1. Test each color (red, yellow, green, blue, white) individually
2. Verify each color has appropriate background styling
3. Verify borders and visual clarity

### Phase 4: Multiple Cards Testing
1. Give clues that affect multiple cards (2-3 cards)
2. Verify all matching cards show visualization
3. Verify non-matching cards remain unchanged

## Debugging Checklist

If clue visualization isn't working:

1. **Check browser console** for errors
2. **Verify clue was sent** - look for "Sending clue:" log
3. **Verify clue was received** - look for "Action result received:" log
4. **Check currentClueVisualization** - should be populated after clue
5. **Verify CSS classes** - inspect cards to see if classes are applied
6. **Check card rendering** - ensure updateHandsDisplay() is called

## Expected CSS Classes

**Number Clue Cards:**
- Remove: `hidden`
- Add: `clued-number`
- Attribute: `data-clued-number="3"`

**Color Clue Cards:**
- Remove: `hidden`  
- Add: `clued-color`, `red-clue` (or appropriate color)

**Observer Cards:**
- Add: `clued-highlight`

## Success Criteria

✅ **Number clues show blue circle with number**
✅ **Color clues show colored background with "?"**
✅ **Observers see green highlighting on clued cards**
✅ **Confirmation overlay appears for recipient and observers (NOT giver)**
✅ **Clue giver does not see confirmation modal**
✅ **Clue giver's highlighting clears automatically after giving clue**
✅ **All game buttons disabled while modal is active**
✅ **Keyboard shortcuts disabled while modal is active**
✅ **No toast notification (only modal popup)**
✅ **Visualization clears after confirmation**
✅ **Cards return to normal hidden state**
✅ **Game continues normally after confirmation**
✅ **All colors work correctly**
✅ **Multiple matching cards work correctly**
✅ **Visual quality is clear and distinguishable**

## Notes
- The visualization should be immediately visible when the clue is received
- The confirmation overlay should block further game interaction for the target player
- Other players should be able to continue playing while visualization is active
- All game logic and rules remain unchanged
- The feature enhances UX without affecting game mechanics 