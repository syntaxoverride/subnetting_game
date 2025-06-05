# Network Architect - Subnetting Game

A web-based game to practice and improve your IP subnetting skills. Test your knowledge of IP addressing, subnet masks, and network calculations.

## Features

- Three difficulty levels: Beginner, Intermediate, and Advanced
- 10 random subnetting challenges per game round
- Interactive UI with progress tracking
- Comprehensive CIDR reference chart
- Immediate feedback on answers
- Score tracking and performance evaluation

## How to Play

1. Choose a difficulty level (Beginner, Intermediate, or Advanced)
2. For each question, you'll be given:
   - A main address block (network/CIDR)
   - Required number of hosts to accommodate
3. Fill in the following information:
   - First usable IP in the subnet
   - Last usable IP in the subnet
   - Network ID (optional for bonus points)
   - Broadcast address (optional for bonus points)
4. Click "Allocate" to submit your answer
5. Receive instant feedback and points
6. Complete 10 questions to finish the game

## Scoring

- 2 points for correct first usable IP
- 2 points for correct last usable IP
- 1 point for correct network IP
- 1 point for correct broadcast IP
- Maximum of 6 points per question (60 points total)

## CIDR Reference

Click the "Show CIDR Chart Reference" button to access a complete table of CIDR notations, subnet masks, wildcard masks, and usable IP counts.

## Running the Game

Simply open `index.html` in a web browser to start playing. No server required!

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)

## Learning Objectives

- Understanding IP address structure
- Calculating subnet masks and CIDR notation
- Determining network, broadcast, and usable IP ranges
- Subnetting to accommodate specific host requirements
- Applying subnetting knowledge to practical scenarios 