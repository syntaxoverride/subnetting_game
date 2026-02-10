# Network Architect - Subnetting Game

A web-based game to practice and improve your IP subnetting skills. Test your knowledge of IP addressing, subnet masks, and network calculations through real-world scenarios.

## Features

- Three difficulty levels: Beginner, Intermediate, and Advanced
- 20 subnetting challenges per game round
- Real-world scenario context for every question (offices, hospitals, data centers, etc.)
- Time-gated, three-level hint system (conceptual guidance → worked steps → full answer)
- Contextual feedback with hints — wrong answers show guidance, not solutions
- Varied IP address ranges across all difficulties (10.x, 172.16.x, 192.168.x, and public IPs)
- All questions use /24 to /30 subnets (max 254 usable hosts)
- Interactive binary address visualization
- Comprehensive CIDR reference chart
- Built-in subnetting help guide with worked examples
- Per-difficulty completion flags (encrypted with AES-256-GCM)

## How to Play

1. Choose a difficulty level (Beginner, Intermediate, or Advanced)
2. For each question, you'll be given:
   - A real-world scenario explaining why you need to subnet
   - A main address block (network/CIDR)
   - Required number of hosts to accommodate
   - The subnet mask
3. Fill in the following information:
   - Network IP
   - First usable IP in the subnet
   - Last usable IP in the subnet
   - Broadcast address
4. Click "Allocate" to submit your answer
5. Review feedback — hints guide you toward the right answer without giving it away
6. Click "Next Question" to continue
7. Complete all 20 questions to earn your difficulty-specific flag

## Difficulty Levels

| Level | CIDR Range | IP Addresses | Description |
|---|---|---|---|
| **Beginner** | /24 – /28 | Private IPs from a curated pool | Familiar ranges, moderate host counts |
| **Intermediate** | /24 – /29 | Random public and private IPs | Wider variety, unfamiliar address spaces |
| **Advanced** | /24 – /30 | Random public and private IPs | Includes tight /29 and /30 subnets requiring precision |

## Hint System

Each question has three levels of hints that unlock progressively over time:

| Level | Unlocks At | What It Shows |
|---|---|---|
| **Level 1** | 1:00 | Conceptual guidance — how to approach the problem |
| **Level 2** | 2:30 | Worked steps — shows the math without final answers |
| **Level 3** | 4:00 | Full answer — complete solution with explanation |

The time-gating is designed for a 1-hour lab with 20 challenges (3 minutes per question).

## Running the Game

Simply open `index.html` in a web browser to start playing. No server required!

Hosted via GitHub Pages or any static file server.

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Web Crypto API (AES-256-GCM flag encryption with PBKDF2 key derivation)

## Learning Objectives

- Understanding IP address structure across private and public ranges
- Calculating subnet masks and CIDR notation
- Determining network, broadcast, and usable IP ranges
- Subnetting to accommodate specific host requirements
- Applying subnetting knowledge to practical, real-world scenarios
