# Interactive Elements Testing Guide

## Overview
This guide covers testing the new interactive elements system including action buttons, card interactions, and clue giving interface.

## Test Setup
1. Start server: `node server.js`
2. Open browser to `http://localhost:3000`
3. Create a room with 2-3 players for easier testing
4. Start the game

## Interactive Elements Features to Test

### 1. Action Buttons Display
**Expected Behavior:**
- Action buttons only appear for the current player during their turn
- Three buttons: "Play (P)", "Discard (D)", "Give Clue (C)"
- Buttons disappear when it's not your turn

**Test Steps:**
1. Start a game with multiple players
2. Verify action buttons appear only for current player
3. Switch turns and verify buttons move to next player
4. Check buttons are hidden for non-current players

### 2. Keyboard Shortcuts
**Expected Behavior:**
- P key: Enter play state (or cancel if already in a state)
- D key: Enter discard state (or cancel if already in a state)  
- C key: Enter clue state (or cancel if already in a state)
- Escape key: Cancel current action state

**Test Steps:**
1. During your turn, press 'P' - should enter play state
2. Press 'P' again - should cancel and return to idle
3. Test same behavior with 'D' and 'C' keys
4. Enter any state and press Escape - should cancel
5. Verify shortcuts don't work when not your turn
6. Verify shortcuts don't interfere when typing in lobby inputs

### 3. Play/Discard Card Interaction
**Expected Behavior:**
- Click "Play" or "Discard" button to enter respective state
- Only your own cards become interactive (glowing animation)
- Other players' cards become non-interactive (dimmed)
- Game state indicator shows instruction
- Cancel button (×) appears on action buttons container

**Test Steps:**
1. Click "Play" button
   - Verify your cards glow and are clickable
   - Verify other cards are dimmed
   - Verify state indicator shows "Click on one of your cards to play it"
   - Click on one of your cards - should play the card and reset state
2. Click "Discard" button
   - Same behavior as play but for discarding
   - Click on one of your cards - should discard and reset state
3. Test cancel functionality
   - Enter play/discard state
   - Click the × button - should return to idle state

### 4. Give Clue Interaction
**Expected Behavior:**
- Click "Give Clue" button to enter clue state
- Clue type buttons appear: "By Color" and "By Number"
- Your cards become non-interactive, other players' cards become interactive
- After selecting clue type, hovering over cards shows preview highlighting
- Clicking on a card gives the clue and resets state

**Test Steps:**
1. Click "Give Clue" button
   - Verify clue type buttons appear
   - Verify your cards are dimmed
   - Verify other players' cards are interactive
2. Click "By Color" button
   - Button should become active/highlighted
   - State indicator should update
3. Hover over a red card of another player
   - All red cards of that player should highlight with yellow glow
   - Other cards should remain normal
4. Move mouse to a blue card of the same player
   - Red cards should stop highlighting
   - Blue cards should start highlighting
5. Click on a highlighted card
   - Should send clue and reset to idle state
   - Clue should be processed by game logic
6. Test "By Number" clue type similarly

### 5. Clue Token Validation
**Expected Behavior:**
- "Give Clue" button should be disabled/show error when no clue tokens available
- Should not be able to enter clue state with 0 clue tokens

**Test Steps:**
1. Use all clue tokens (give 8 clues)
2. Try to click "Give Clue" button
3. Should show error message "No clue tokens available!"
4. Should not enter clue state

### 6. Turn Validation
**Expected Behavior:**
- All interactions should only work during your turn
- Attempting actions during other players' turns should show error

**Test Steps:**
1. During another player's turn, try:
   - Clicking action buttons (should be hidden)
   - Using keyboard shortcuts (should not work)
   - Clicking on cards (should show "Not your turn!" message)

### 7. State Management
**Expected Behavior:**
- Only one action state can be active at a time
- Switching between states should properly reset previous state
- State should reset when turn ends

**Test Steps:**
1. Enter play state, then click discard button
   - Should switch from play to discard state
   - Card interactivity should update accordingly
2. Enter clue state, select color, then click play button
   - Should exit clue state and enter play state
   - Clue type buttons should hide
3. Enter any state, then end turn (by performing action)
   - State should reset to idle for next player

### 8. Visual Feedback
**Expected Behavior:**
- Interactive cards have glowing animation
- Highlighted cards (clue preview) have yellow border pulse
- Active action buttons are highlighted
- State indicator shows current instruction

**Test Steps:**
1. Verify all visual animations work smoothly
2. Check that colors and animations are clearly distinguishable
3. Verify state indicator updates correctly for each action
4. Test on different screen sizes/mobile if possible

### 9. Game State Indicator
**Expected Behavior:**
- Shows in top-right corner during active states
- Hidden during idle state
- Updates with appropriate instructions for each state

**Test Steps:**
1. Verify indicator is hidden initially
2. Enter each state and verify appropriate message shows
3. Cancel state and verify indicator hides
4. Check positioning doesn't interfere with game board

### 10. Error Handling
**Expected Behavior:**
- Graceful handling of invalid actions
- Clear error messages for user feedback
- No crashes or broken states

**Test Steps:**
1. Try rapid clicking on buttons and cards
2. Try keyboard shortcuts in rapid succession
3. Test edge cases like disconnection during action state
4. Verify error messages are user-friendly

## Expected Results Summary

### Working Features:
- ✅ Action buttons appear only for current player
- ✅ Keyboard shortcuts (P, D, C, Escape)
- ✅ Play/Discard card interaction with visual feedback
- ✅ Give clue interaction with type selection
- ✅ Clue preview highlighting on hover
- ✅ Turn validation and error messages
- ✅ State management and transitions
- ✅ Visual feedback and animations
- ✅ Game state indicator
- ✅ Clue token validation

### Recent Fixes (Clue Giving):
- ✅ Fixed data type conversion for number clues (string to integer)
- ✅ Added debugging console logs for clue operations
- ✅ Added clue notification system for visual feedback
- ✅ Enhanced error handling and reporting

### New Clue Visualization Features:
- ✅ Clue recipient sees clue information on their own cards
- ✅ Number clues show the number on hidden cards
- ✅ Color clues show colored border on hidden cards
- ✅ Other players see highlighted cards showing what was clued
- ✅ Persistent visualization with confirmation overlay
- ✅ Manual confirmation required to clear visualization

## Testing Clue Visualization

### For the Clue Recipient (Target Player):

**Number Clues:**
1. When you receive a number clue (e.g., "number 3")
2. Your hidden cards that match will show a blue circle with the number
3. Cards will show "Your card - Number 3" on hover
4. A confirmation overlay appears: "Player X gave you a number 3 clue"
5. Click "Got it! Continue Game" to clear the visualization

**Color Clues:**
1. When you receive a color clue (e.g., "red color")
2. Your hidden cards that match will have a yellow border
3. Cards will show "Your card - red color" on hover
4. A confirmation overlay appears: "Player X gave you a red color clue"
5. Click "Got it! Continue Game" to clear the visualization

### For Other Players (Observers):

**Viewing Clued Cards:**
1. When a clue is given to another player
2. That player's cards that match the clue will have green highlighting
3. The highlighting pulses to draw attention
4. You can see exactly which cards were affected by the clue
5. Highlighting persists until the target player confirms

### Testing Steps:

1. **Start a 3-player game** for best testing
2. **Player 1's turn**: Give a number clue to Player 2
   - Click "Give Clue" → "By Number" → Click on a "3" card
   - **Player 2 should see**: Blue circles with "3" on matching cards + overlay
   - **Player 3 should see**: Green highlighting on Player 2's matching cards
3. **Player 2**: Click "Got it! Continue Game"
   - **All players should see**: Visualization clears
4. **Player 2's turn**: Give a color clue to Player 3
   - Click "Give Clue" → "By Color" → Click on a red card
   - **Player 3 should see**: Yellow borders on matching cards + overlay
   - **Players 1&2 should see**: Green highlighting on Player 3's matching cards
5. **Player 3**: Click "Got it! Continue Game"
   - **All players should see**: Visualization clears

### Expected Visual Results:

**Number Clue Visualization:**
- Target player: `?` cards with blue circle overlay showing the number
- Other players: Green pulsing border on the clued cards

**Color Clue Visualization:**
- Target player: `?` cards with yellow border
- Other players: Green pulsing border on the clued cards

**Confirmation Overlay:**
- Modal dialog with clue description
- "Got it! Continue Game" button
- Only appears for the clue recipient
- Blocks game interaction until confirmed

## Debugging Clue Issues

### Console Debugging
When testing clue giving, check the browser console for:

1. **Client-side logs**:
   ```
   Sending clue: {targetPlayerId: "...", clueType: "color", clueValue: "red"}
   Action result received: {action: {...}, gameState: {...}}
   ```

2. **Server-side logs** (in terminal):
   ```
   Player [playerId] gave clue in room [roomCode]
   ```

3. **Error logs** (if any):
   ```
   Socket error: {message: "..."}
   Error giving clue: [error details]
   ```

### Testing Clue Giving Step-by-Step

1. **Open browser console** (F12 → Console tab)
2. **Start a game** with 2+ players
3. **During your turn**:
   - Click "Give Clue" button
   - Select "By Color" or "By Number"
   - Hover over a card to see preview highlighting
   - Click on the card to give the clue
4. **Check for**:
   - Console log showing "Sending clue: ..."
   - Console log showing "Action result received: ..."
   - Clue notification appearing in top-right corner
   - Game state updating (clue tokens decreasing)
   - Turn advancing to next player

### Common Issues and Solutions

**Issue**: No console logs when clicking on card
- **Solution**: Make sure you've selected a clue type first

**Issue**: "Socket error" in console
- **Solution**: Check server terminal for detailed error message

**Issue**: Clue notification doesn't appear
- **Solution**: Check if actionResult is being received in console

**Issue**: Number clues not working
- **Solution**: Fixed - numbers are now properly converted to integers

## Notes
- The interactive system maintains all existing game logic
- Server-side validation remains unchanged
- All game rules and mechanics work as before
- Enhanced UI provides better user experience while preserving game integrity 