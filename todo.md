# Hanabi Online - Development Todo

## 🎯 Core Game Infrastructure

### Backend/Server Setup
- [x] Set up Node.js/Express server or similar backend framework
- [x] Implement WebSocket connection handling for real-time multiplayer
- [x] Create room management system with unique room codes
- [x] Implement player connection/disconnection handling
- [x] Add 5-minute reconnection grace period logic
- [x] Set up 30-minute inactivity room cleanup
- [x] Implement host transfer when original host disconnects

### Game State Management
- [x] Design and implement core game state structure
- [x] Create card deck generation (5 colors, proper card distribution)
- [x] Implement random card dealing logic
- [x] Build turn management system with fixed turn order
- [x] Create clue token management (start with 8, max 8)
- [x] Create fuse token management (start with 3, max 3)
- [x] Implement fireworks pile state tracking

## 🃏 Card Game Logic

### Card Management
- [x] Implement card structure (color, number, unique ID)
- [x] Create hand management for 2-5 players (5 cards for 2-3 players, 4 cards for 4-5 players)
- [x] Implement card drawing from deck
- [x] Track deck state and detect when last card is drawn
- [x] Implement final round logic when deck is empty

### Game Actions
- [x] **Play Card Action**:
  - [x] Validate card can be played (correct number in sequence)
  - [x] Handle successful plays (add to firework pile)
  - [x] Handle invalid plays (lose fuse token)
  - [x] Check for game end conditions after play
- [x] **Discard Card Action**:
  - [x] Remove card from hand
  - [x] Add clue token (if not at max)
  - [x] Draw replacement card (if deck not empty)
- [x] **Give Clue Action**:
  - [x] Validate clue target (not self)
  - [x] Validate clue tokens available
  - [x] Implement color clue logic
  - [x] Implement number clue logic
  - [x] Highlight all matching cards
  - [x] Deduct clue token

### Game End Conditions
- [x] Detect all fireworks completed (score 25)
- [x] Detect all fuse tokens lost (game failure)
- [x] Detect player disconnection timeout
- [x] Implement final round after deck empty
- [x] Calculate and display final score

## 🎮 Frontend/UI Implementation

### Lobby System
- [x] Create room creation interface
- [x] Implement room joining via code
- [x] Display player list with nicknames
- [x] Show host indicator
- [x] Add "Start Game" button (host only)
- [x] Validate 2-5 players before start
- [x] Handle nickname input (no validation/filtering)
- [x] Real-time player list synchronization
- [x] Proper disconnection/reconnection handling
- [x] Host transfer functionality
- [x] localStorage for persistent room code and nickname auto-fill

### Game Board Layout
- [x] **Player Hand Positioning**:
  - [x] Own hand at bottom (cards facing away)
  - [x] 2 players: other player at top
  - [x] 3 players: left and right positions
  - [x] 4 players: left, top, right positions
  - [x] 5 players: arranged around central table
- [x] **Fireworks Display Area**:
  - [x] 5 color-coded firework piles
  - [x] Show current top card of each pile
  - [x] Visual indication of pile progress
- [x] **Token Display**:
  - [x] 8 blue clue tokens (visual counter)
  - [x] 3 red fuse tokens (visual counter)
  - [x] Static display, no special highlighting

### Interactive Elements
- [x] **Card Interaction**:
  - [x] Click to play/discard with confirmation popup
  - [x] Toggle to disable confirmation popup
  - [x] Visual feedback for card selection
- [x] **Clue Giving Interface**:
  - [x] "Give Clue" button
  - [x] Color/Number selection
  - [x] Target player card selection
  - [x] Highlight animation for matching cards
  - [x] Clue confirmation and broadcast
- [x] **Turn Indicator**:
  - [x] Clear visual indication of current player's turn
  - [x] Disable actions when not player's turn

### Visual Feedback
- [x] Card highlighting animations for clues ✨ Enhanced
- [x] Smooth transitions for card plays/discards ✅ New  
- [x] Visual feedback for invalid actions ✅ New
- [x] Clear indication of game state changes ✅ New

## 🔧 Connection & Error Handling

### Connection Management
- [ ] Implement automatic reconnection logic
- [ ] Handle browser refresh/back button blocking
- [ ] Show connection status to players
- [ ] Graceful handling of network interruptions

### Error Handling
- [ ] Silent error handling for invalid actions
- [ ] Retry mechanisms for failed actions
- [ ] Clear error messages for connection issues
- [ ] Fallback UI states for edge cases

## 🎯 Game Flow Features

### Pre-Game
- [ ] Room code generation and sharing
- [ ] Player nickname assignment
- [ ] Host controls and permissions
- [ ] Game start validation

### During Game
- [ ] Real-time game state synchronization
- [ ] Action validation and broadcasting
- [ ] Turn progression management
- [ ] Live updates for all players

### Post-Game
- [ ] Final score calculation and display
- [ ] Game summary with played cards by color
- [ ] "Play Again" functionality with same group
- [ ] Room cleanup after game ends

## 🚀 Technical Requirements

### Performance & Scalability
- [ ] Optimize WebSocket message handling
- [ ] Implement efficient game state updates
- [ ] Handle multiple concurrent rooms
- [ ] Memory management for room cleanup

### Browser Compatibility
- [ ] Cross-browser WebSocket support
- [ ] Mobile-responsive design
- [ ] Touch interaction support
- [ ] Prevent accidental navigation

### Data Management
- [ ] Ephemeral data storage (no persistence)
- [ ] Secure room code generation
- [ ] Game state validation
- [ ] Anti-cheat measures (server-side validation)

## 📱 UI/UX Polish

### Visual Design
- [ ] Clean, intuitive card game interface
- [ ] Color-coded fireworks and cards
- [ ] Responsive layout for different screen sizes
- [ ] Accessibility considerations (color contrast, etc.)

### User Experience
- [ ] Smooth animations and transitions
- [ ] Clear visual hierarchy
- [ ] Intuitive interaction patterns
- [ ] Helpful tooltips and guidance

## 🧪 Testing & Quality Assurance

### Game Logic Testing
- [ ] Unit tests for card game rules
- [ ] Integration tests for multiplayer scenarios
- [ ] Edge case testing (disconnections, invalid moves)
- [ ] End-to-end game flow testing

### Performance Testing
- [ ] Load testing for multiple concurrent games
- [ ] Network latency handling
- [ ] Memory leak detection
- [ ] Browser compatibility testing

## 🚀 Deployment & Infrastructure

### Production Setup
- [ ] Server deployment configuration
- [ ] WebSocket scaling considerations
- [ ] Monitoring and logging
- [ ] Error tracking and analytics

### Documentation
- [ ] API documentation
- [ ] Deployment guide
- [ ] User manual/help section
- [ ] Code documentation and comments

---

## Priority Levels

### 🔴 Critical (MVP)
- Core game logic and rules
- Basic multiplayer functionality
- Essential UI components
- Connection handling

### 🟡 Important (V1.1)
- Polish and animations
- Error handling improvements
- Performance optimizations
- Cross-browser compatibility

### 🟢 Nice-to-Have (Future)
- Advanced UI polish
- Additional game modes
- Enhanced reconnection features
- Analytics and monitoring 