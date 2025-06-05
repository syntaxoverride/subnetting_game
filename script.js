// DOM Elements
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const beginnerBtn = document.getElementById('beginner');
const intermediateBtn = document.getElementById('intermediate');
const advancedBtn = document.getElementById('advanced');
const progressText = document.querySelector('.progress-text');
const progressBar = document.querySelector('.progress');
const mainAddressEl = document.getElementById('main-address');
const addressDisplayEl = document.getElementById('address-display');
const addressVisualizationEl = document.getElementById('address-visualization');
const requiredHostsEl = document.getElementById('required-hosts');
const subnetMaskEl = document.getElementById('subnet-mask');
const firstUsableInput = document.getElementById('first-usable');
const lastUsableInput = document.getElementById('last-usable');
const allocateBtn = document.getElementById('allocate-btn');
const networkIpInput = document.getElementById('network-ip');
const broadcastIpInput = document.getElementById('broadcast-ip');
const scoreEl = document.getElementById('score');
const statusMessageEl = document.getElementById('status-message');
const showCidrBtn = document.getElementById('show-cidr');
const showHelpBtn = document.getElementById('show-help');
const cidrModal = document.getElementById('cidr-modal');
const helpModal = document.getElementById('help-modal');
const closeModalBtn = document.querySelector('.close');
const closeHelpBtn = document.querySelector('.close-help');
const cidrTableBody = document.querySelector('#cidr-table tbody');
const startMessageEl = document.getElementById('start-message');
const subnetHintEl = document.getElementById('subnet-hint');
const showHintBtn = document.getElementById('show-hint');
const hintContentEl = document.getElementById('hint-content');
const flagContainerEl = document.getElementById('flag-container');

// Game state
let gameState = {
    currentDifficulty: null,
    score: 0,
    currentQuestion: 0,
    totalQuestions: 10,
    mainAddressBlock: null,
    requiredHosts: null,
    correctSubnetMask: null,
    correctFirstUsable: null,
    correctLastUsable: null,
    correctNetworkIp: null,
    correctBroadcastIp: null,
    allocatedSubnets: [],
    gameActive: false
};

// CIDR Data for reference table
const cidrData = [];
for (let i = 0; i <= 32; i++) {
    const netmaskBits = i;
    const hostBits = 32 - i;
    const usableIPs = hostBits > 0 ? Math.pow(2, hostBits) - 2 : 0;
    
    let subnetMask = '';
    let wildcard = '';
    let octet = [0, 0, 0, 0];
    
    for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 8; k++) {
            const bitPosition = j * 8 + k;
            if (bitPosition < netmaskBits) {
                octet[j] += Math.pow(2, 7 - k);
            }
        }
    }
    
    subnetMask = octet.join('.');
    wildcard = octet.map(o => 255 - o).join('.');
    
    cidrData.push({
        prefix: '/' + i,
        subnetMask,
        wildcard,
        usableIPs: usableIPs === 0 ? 'N/A' : usableIPs,
        netmaskBits,
        hostBits
    });
}

// IP Address utilities
function ipToInt(ip) {
    return ip.split('.').reduce((sum, octet) => (sum << 8) + parseInt(octet, 10), 0) >>> 0;
}

function intToIp(int) {
    return [
        (int >>> 24) & 255,
        (int >>> 16) & 255,
        (int >>> 8) & 255,
        int & 255
    ].join('.');
}

function generateRandomIpv4() {
    const ipClass = Math.random() < 0.7 ? 'private' : 'public';
    
    if (ipClass === 'private') {
        const type = Math.floor(Math.random() * 3);
        switch (type) {
            case 0: // 10.0.0.0/8
                return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.0`;
            case 1: // 172.16.0.0/12
                return `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 256)}.0`;
            case 2: // 192.168.0.0/16
                return `192.168.${Math.floor(Math.random() * 256)}.0`;
        }
    } else {
        let first = Math.floor(Math.random() * 223) + 1;
        // Avoid private IP ranges
        while ((first === 10) || (first === 172 && (second >= 16 && second <= 31)) || (first === 192 && second === 168)) {
            first = Math.floor(Math.random() * 223) + 1;
        }
        const second = Math.floor(Math.random() * 256);
        const third = Math.floor(Math.random() * 256);
        return `${first}.${second}.${third}.0`;
    }
}

function calculateSubnetInfo(networkAddress, cidrPrefix) {
    const netmaskInt = (0xffffffff << (32 - cidrPrefix)) >>> 0;
    const netmask = intToIp(netmaskInt);
    const networkInt = ipToInt(networkAddress) & netmaskInt;
    const network = intToIp(networkInt);
    const broadcastInt = networkInt | (~netmaskInt >>> 0);
    const broadcast = intToIp(broadcastInt);
    const firstUsable = intToIp(networkInt + 1);
    const lastUsable = intToIp(broadcastInt - 1);
    const totalHosts = Math.pow(2, 32 - cidrPrefix);
    const usableHosts = totalHosts > 2 ? totalHosts - 2 : 0;
    
    return {
        network,
        netmask,
        broadcast,
        firstUsable,
        lastUsable,
        totalHosts,
        usableHosts,
        cidrPrefix
    };
}

// Game generators
function generateQuestion(difficulty) {
    let cidrPrefix, baseIp, requiredHosts;
    
    switch (difficulty) {
        case 'beginner':
            // Simple subnets with easy math (usually /24 to /30)
            cidrPrefix = Math.floor(Math.random() * 7) + 24; // /24 to /30
            baseIp = '192.168.1.0';
            requiredHosts = Math.floor(Math.random() * 50) + 5; // 5 to 54 hosts
            break;
        case 'intermediate':
            // Medium difficulty (wider range of prefixes)
            cidrPrefix = Math.floor(Math.random() * 12) + 16; // /16 to /27
            baseIp = generateRandomIpv4();
            requiredHosts = Math.floor(Math.random() * 500) + 50; // 50 to 549 hosts
            break;
        case 'advanced':
            // Complex subnetting with variable-length subnet masks
            cidrPrefix = Math.floor(Math.random() * 24) + 8; // /8 to /31
            baseIp = generateRandomIpv4();
            requiredHosts = Math.floor(Math.random() * 5000) + 100; // 100 to 5099 hosts
            break;
    }
    
    const subnetInfo = calculateSubnetInfo(baseIp, cidrPrefix);
    
    return {
        mainAddressBlock: `${subnetInfo.network}/${cidrPrefix}`,
        requiredHosts,
        networkIp: subnetInfo.network,
        subnetMask: subnetInfo.netmask,
        broadcastIp: subnetInfo.broadcast,
        firstUsable: subnetInfo.firstUsable,
        lastUsable: subnetInfo.lastUsable,
        cidrPrefix
    };
}

function getRequiredCidrPrefix(requiredHosts) {
    // Calculate the minimum CIDR prefix needed to accommodate the required hosts
    // Hosts = 2^(32-prefix) - 2
    // Solving for prefix: prefix = 32 - log2(requiredHosts + 2)
    const hostBits = Math.ceil(Math.log2(requiredHosts + 2));
    return 32 - hostBits;
}

// UI Updates
function updateProgressBar() {
    const progress = (gameState.currentQuestion / gameState.totalQuestions) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Round Progress: ${progress}% (Question ${gameState.currentQuestion} of ${gameState.totalQuestions})`;
}

function updateScore(points) {
    gameState.score += points;
    scoreEl.textContent = gameState.score;
}

function displayStatus(message, color = '#0275d8') {
    statusMessageEl.textContent = message;
    statusMessageEl.style.color = color;
}

function resetInputs() {
    firstUsableInput.value = '';
    lastUsableInput.value = '';
    networkIpInput.value = '';
    broadcastIpInput.value = '';
}

function populateCidrTable() {
    cidrTableBody.innerHTML = '';
    
    cidrData.forEach(data => {
        const row = document.createElement('tr');
        
        // Generate example subnets based on prefix
        const subnetsHtml = generateSubnetExamples(data.prefix);
        
        row.innerHTML = `
            <td>${data.prefix}</td>
            <td>${data.subnetMask}</td>
            <td>${data.wildcard}</td>
            <td>${data.usableIPs}</td>
            <td>${data.netmaskBits}</td>
            <td>${data.hostBits}</td>
            <td>${subnetsHtml}</td>
        `;
        cidrTableBody.appendChild(row);
    });
}

// Generate example subnets for different CIDR prefixes
function generateSubnetExamples(cidrPrefix) {
    const prefix = parseInt(cidrPrefix.substring(1));
    
    if (prefix === 0) {
        return "0.0.0.0 (entire Internet)";
    }
    
    if (prefix > 30) {
        return "N/A (special purpose)";
    }
    
    let subnets = [];
    
    // For /8 networks (Class A)
    if (prefix === 8) {
        subnets.push("10.0.0.0/8 (Private Class A)");
        subnets.push("172.0.0.0/8");
        subnets.push("192.0.0.0/8");
        return subnets.join("<br>");
    }
    
    // For /16 networks (Class B)
    if (prefix === 16) {
        subnets.push("172.16.0.0/16 (Private Class B)");
        subnets.push("192.168.0.0/16 (Private Class B)");
        subnets.push("10.0.0.0/16, 10.1.0.0/16, ...");
        return subnets.join("<br>");
    }
    
    // For /24 networks (Class C)
    if (prefix === 24) {
        subnets.push("192.168.1.0/24 (Common Private LAN)");
        subnets.push("192.168.0.0/24, 192.168.2.0/24, ...");
        subnets.push("10.0.0.0/24, 10.0.1.0/24, ...");
        return subnets.join("<br>");
    }
    
    // Show subnetting examples from within a /24 network
    if (prefix > 24 && prefix <= 30) {
        const blockSize = Math.pow(2, 32 - prefix);
        const subnetCount = Math.pow(2, prefix - 24);
        
        // Show all possible subnets for a 192.168.1.0/24 network
        subnets.push(`<strong>${subnetCount} possible subnets in a /24:</strong>`);
        
        // List first few subnets
        const maxToShow = Math.min(8, subnetCount);
        for (let i = 0; i < maxToShow; i++) {
            const fourthOctet = (i * blockSize);
            subnets.push(`192.168.1.${fourthOctet}/` + prefix);
        }
        
        // Indicate there are more if needed
        if (maxToShow < subnetCount) {
            subnets.push(`... (${subnetCount-maxToShow} more)`);
        }
        
        return subnets.join("<br>");
    }
    
    // For subnets between /9 and /15 (subdivisions of Class A)
    if (prefix > 8 && prefix < 16) {
        const subnetCount = Math.pow(2, prefix - 8);
        subnets.push(`<strong>${subnetCount} possible subnets in a /8:</strong>`);
        
        const secondOctetIncrement = 256 / subnetCount;
        
        // Show first few examples
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            const secondOctet = Math.floor(i * secondOctetIncrement);
            subnets.push(`10.${secondOctet}.0.0/` + prefix);
        }
        
        if (subnetCount > 4) {
            subnets.push(`... (${subnetCount-4} more)`);
        }
        
        return subnets.join("<br>");
    }
    
    // For subnets between /17 and /23 (subdivisions of Class B)
    if (prefix > 16 && prefix < 24) {
        const subnetCount = Math.pow(2, prefix - 16);
        subnets.push(`<strong>${subnetCount} possible subnets in a /16:</strong>`);
        
        const thirdOctetIncrement = 256 / subnetCount;
        
        // Show examples
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            const thirdOctet = Math.floor(i * thirdOctetIncrement);
            subnets.push(`192.168.${thirdOctet}.0/` + prefix);
        }
        
        if (subnetCount > 4) {
            subnets.push(`... (${subnetCount-4} more)`);
        }
        
        return subnets.join("<br>");
    }
    
    // For very large subnets (/1 to /7)
    if (prefix < 8) {
        if (prefix === 1) {
            return "0.0.0.0/1 (half the Internet)<br>128.0.0.0/1 (other half)";
        }
        
        const subnetCount = Math.pow(2, prefix);
        subnets.push(`<strong>${subnetCount} possible subnets:</strong>`);
        
        const increment = 256 / (subnetCount / Math.pow(2, prefix - 1));
        
        for (let i = 0; i < Math.min(3, subnetCount); i++) {
            const firstOctet = Math.floor(i * increment);
            subnets.push(`${firstOctet}.0.0.0/` + prefix);
        }
        
        if (subnetCount > 3) {
            subnets.push(`... (${subnetCount-3} more)`);
        }
        
        return subnets.join("<br>");
    }
    
    return "Examples not available";
}

function visualizeAddressBlock(networkAddress, cidrPrefix) {
    if (!addressVisualizationEl) return;
    
    // Extract the network bits based on CIDR prefix
    const networkBits = cidrPrefix;
    const hostBits = 32 - networkBits;
    
    // Convert IP to binary representation
    const ipParts = networkAddress.split('.');
    const binaryParts = ipParts.map(part => {
        const binary = parseInt(part).toString(2).padStart(8, '0');
        return binary;
    });
    
    const binaryString = binaryParts.join('');
    
    // Add dots to make it more readable
    const formattedBinary = [
        binaryString.slice(0, 8),
        binaryString.slice(8, 16),
        binaryString.slice(16, 24),
        binaryString.slice(24, 32)
    ].join('.');
    
    // Split binary string into network and host parts
    const networkPartIndex = networkBits;
    let formattedDisplay = '';
    
    // Format with coloring for network vs host bits
    for (let i = 0; i < formattedBinary.length; i++) {
        const char = formattedBinary[i];
        const currentBitIndex = i - Math.floor(i / 9); // Adjust for dots
        
        if (char === '.') {
            formattedDisplay += '.';
        } else if (currentBitIndex < networkBits) {
            formattedDisplay += `<span style="color: #007bff; font-weight: bold;">${char}</span>`;
        } else {
            formattedDisplay += `<span style="color: #dc3545;">${char}</span>`;
        }
    }
    
    // Create visualization
    addressVisualizationEl.innerHTML = `
        <div>${formattedDisplay}</div>
        <div style="font-size: 12px; margin-top: 8px;">
            <span style="color: #007bff; font-weight: bold;">Network Bits (${networkBits})</span> | 
            <span style="color: #dc3545;">Host Bits (${hostBits})</span>
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
            Usable Hosts: ${Math.pow(2, hostBits) - 2}
        </div>
    `;
}

// Game Logic
function startGame(difficulty) {
    // Reset game state
    gameState.currentDifficulty = difficulty;
    gameState.score = 0;
    gameState.currentQuestion = 0;
    gameState.allocatedSubnets = [];
    gameState.gameActive = true;
    
    // Update UI
    scoreEl.textContent = '0';
    startMessageEl.style.display = 'none';
    resetInputs();
    updateProgressBar();
    
    // Set active difficulty button
    difficultyBtns.forEach(btn => btn.classList.remove('active'));
    document.getElementById(difficulty).classList.add('active');
    
    // Generate first question
    nextQuestion();
}

function nextQuestion() {
    if (gameState.currentQuestion >= gameState.totalQuestions) {
        endGame();
        return;
    }
    
    // Generate a new question
    const question = generateQuestion(gameState.currentDifficulty);
    
    // Update game state with new question
    gameState.mainAddressBlock = question.mainAddressBlock;
    gameState.requiredHosts = question.requiredHosts;
    gameState.correctNetworkIp = question.networkIp;
    gameState.correctSubnetMask = question.subnetMask;
    gameState.correctBroadcastIp = question.broadcastIp;
    gameState.correctFirstUsable = question.firstUsable;
    gameState.correctLastUsable = question.lastUsable;
    
    // Calculate the smallest subnet that can accommodate the required hosts
    const requiredCidrPrefix = getRequiredCidrPrefix(question.requiredHosts);
    
    // Update UI
    mainAddressEl.textContent = question.mainAddressBlock;
    requiredHostsEl.textContent = question.requiredHosts;
    subnetMaskEl.textContent = question.subnetMask;
    
    // Update hint text based on the question
    updateHint(question);
    
    // Visualize the address block
    visualizeAddressBlock(question.networkIp, question.cidrPrefix);
    
    // Update placeholders with examples for this specific question
    firstUsableInput.placeholder = `e.g., ${question.firstUsable}`;
    lastUsableInput.placeholder = `e.g., ${question.lastUsable}`;
    networkIpInput.placeholder = `e.g., ${question.networkIp}`;
    broadcastIpInput.placeholder = `e.g., ${question.broadcastIp}`;
    
    // Clear inputs
    resetInputs();
    
    // Reset status
    displayStatus('Allocate a subnet to accommodate the required hosts.');
    
    // Increment question counter and update progress
    gameState.currentQuestion++;
    updateProgressBar();
}

// Generate hint based on the current question
function updateHint(question) {
    if (!subnetHintEl) return;
    
    const requiredHosts = question.requiredHosts;
    const networkAddress = question.networkIp;
    const cidrPrefix = question.cidrPrefix;
    const requiredCidrPrefix = getRequiredCidrPrefix(requiredHosts);
    
    // Reset hint button text
    showHintBtn.textContent = 'Show Hint';
    hintContentEl.classList.remove('active');
    
    // Build a comprehensive and helpful hint
    let hint = `<strong>Step-by-step solution:</strong><br><br>`;
    
    // Check if the current network can accommodate the required hosts
    const currentNetworkCapacity = Math.pow(2, 32 - cidrPrefix) - 2;
    const canFitInCurrentNetwork = requiredHosts <= currentNetworkCapacity;
    
    // Step 1: Determine required CIDR prefix
    hint += `<strong>1. Find the right subnet size:</strong><br>`;
    hint += `You need to accommodate ${requiredHosts} hosts.<br>`;
    hint += `Formula: 2<sup>(32-prefix)</sup> - 2 = usable hosts<br>`;
    
    // Provide a table of common subnet sizes
    if (requiredHosts <= 254) {
        hint += `<table class="subnet-table">
            <tr><th>CIDR</th><th>Hosts</th><th>Subnet Mask</th><th>Boundary</th></tr>
            <tr><td>/24</td><td>254</td><td>255.255.255.0</td><td>1</td></tr>
            <tr><td>/25</td><td>126</td><td>255.255.255.128</td><td>128</td></tr>
            <tr><td>/26</td><td>62</td><td>255.255.255.192</td><td>64</td></tr>
            <tr><td>/27</td><td>30</td><td>255.255.255.224</td><td>32</td></tr>
            <tr><td>/28</td><td>14</td><td>255.255.255.240</td><td>16</td></tr>
            <tr><td>/29</td><td>6</td><td>255.255.255.248</td><td>8</td></tr>
            <tr><td>/30</td><td>2</td><td>255.255.255.252</td><td>4</td></tr>
        </table>`;
        
        // Highlight the most appropriate CIDR
        hint += `<br><strong>→ For ${requiredHosts} hosts, use /${requiredCidrPrefix} prefix</strong> (see table above)<br><br>`;
    } else {
        hint += `For ${requiredHosts} hosts, you need /${requiredCidrPrefix} prefix<br><br>`;
    }
    
    // Check if we need to warn about main address block size
    if (!canFitInCurrentNetwork) {
        hint += `<div style="color: #dc3545; padding: 5px; border: 1px solid #dc3545; margin-bottom: 10px; border-radius: 4px;">
            <strong>Warning:</strong> The main address block (/${cidrPrefix}) can only fit ${currentNetworkCapacity} hosts.<br>
            You need a larger network block to accommodate ${requiredHosts} hosts.
        </div><br>`;
    }
    
    // Calculate network increment based on the ACTUAL network prefix (not the required one)
    // This ensures our examples make sense within the main address block
    const blockSize = Math.pow(2, 32 - cidrPrefix) / 256;
    
    // Step 2: Calculate the network address
    hint += `<strong>2. Find the network boundaries:</strong><br>`;
    hint += `The main address block is a /${cidrPrefix} network with ${currentNetworkCapacity} usable hosts.<br>`;
    
    // Step 3: Calculate the usable range
    hint += `<strong>3. Calculate the usable IP range:</strong><br>`;
    hint += `• Network address: ${networkAddress}<br>`;
    hint += `• First usable: ${question.firstUsable}<br>`;
    hint += `• Last usable: ${question.lastUsable}<br>`;
    hint += `• Broadcast: ${question.broadcastIp}<br><br>`;
    
    // Add specific guidance based on the context
    if (canFitInCurrentNetwork) {
        hint += `<strong>To answer this question:</strong><br>`;
        hint += `• The first usable IP is always the network address + 1<br>`;
        hint += `• The last usable IP is always the broadcast address - 1<br>`;
    } else {
        hint += `<strong>For this question:</strong><br>`;
        hint += `Since the main address block is too small, you need to:<br>`;
        hint += `1. Find a subnet with /${requiredCidrPrefix} prefix that can fit ${requiredHosts} hosts<br>`;
        hint += `2. The first usable IP will be the network address of that subnet + 1<br>`;
        hint += `3. The last usable IP will be the broadcast address of that subnet - 1<br>`;
    }
    
    subnetHintEl.innerHTML = hint;
}

function checkAnswers() {
    const firstUsable = firstUsableInput.value.trim();
    const lastUsable = lastUsableInput.value.trim();
    const networkIp = networkIpInput.value.trim();
    const broadcastIp = broadcastIpInput.value.trim();
    
    if (!firstUsable || !lastUsable) {
        displayStatus('Please fill in the first and last usable IP addresses.', 'red');
        return;
    }
    
    // Calculate the required prefix for the hosts
    const requiredCidrPrefix = getRequiredCidrPrefix(gameState.requiredHosts);
    
    // Calculate subnet info from user's first usable IP (assuming they correctly identified the network)
    try {
        // First, derive the network address from the first usable IP
        // For this simplification, we'll assume the network address is first usable IP - 1
        const possibleNetworkIpInt = ipToInt(firstUsable) - 1;
        const possibleNetworkIp = intToIp(possibleNetworkIpInt);
        
        // Check if their subnet can accommodate the required hosts
        const userSubnetInfo = calculateSubnetInfo(possibleNetworkIp, requiredCidrPrefix);
        
        // Calculate points based on correctness
        let points = 0;
        let feedbackMessages = [];
        
        // Check first usable IP
        if (firstUsable === userSubnetInfo.firstUsable) {
            points += 2;
        } else {
            feedbackMessages.push(`First usable IP should be ${userSubnetInfo.firstUsable}`);
        }
        
        // Check last usable IP
        if (lastUsable === userSubnetInfo.lastUsable) {
            points += 2;
        } else {
            feedbackMessages.push(`Last usable IP should be ${userSubnetInfo.lastUsable}`);
        }
        
        // Check network IP if provided
        if (networkIp) {
            if (networkIp === userSubnetInfo.network) {
                points += 1;
            } else {
                feedbackMessages.push(`Network IP should be ${userSubnetInfo.network}`);
            }
        }
        
        // Check broadcast IP if provided
        if (broadcastIp) {
            if (broadcastIp === userSubnetInfo.broadcast) {
                points += 1;
            } else {
                feedbackMessages.push(`Broadcast IP should be ${userSubnetInfo.broadcast}`);
            }
        }
        
        // Update subnet mask for display
        subnetMaskEl.textContent = userSubnetInfo.netmask;
        
        if (feedbackMessages.length === 0) {
            displayStatus('Perfect! All answers are correct.', 'green');
            updateScore(6);
        } else {
            displayStatus(feedbackMessages.join('. '), 'orange');
            updateScore(points);
        }
        
        // Record this subnet as allocated
        gameState.allocatedSubnets.push({
            network: userSubnetInfo.network,
            cidrPrefix: requiredCidrPrefix,
            hosts: gameState.requiredHosts
        });
        
        // Move to next question after a short delay
        setTimeout(nextQuestion, 2000);
        
    } catch (error) {
        displayStatus('Invalid IP address format. Please check your inputs.', 'red');
    }
}

function endGame() {
    gameState.gameActive = false;
    
    // Calculate final score percentage
    const maxScore = gameState.totalQuestions * 6; // 6 points per question
    const scorePercentage = Math.round((gameState.score / maxScore) * 100);
    
    // Display final score and message
    let finalMessage;
    let color;
    
    if (scorePercentage >= 90) {
        finalMessage = `Amazing! Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). You're a subnetting expert!`;
        color = 'green';
    } else if (scorePercentage >= 70) {
        finalMessage = `Good job! Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). You have solid subnetting skills.`;
        color = 'blue';
    } else if (scorePercentage >= 50) {
        finalMessage = `Not bad! Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). Keep practicing to improve.`;
        color = 'orange';
    } else {
        finalMessage = `Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). Subnetting takes practice. Try again!`;
        color = 'red';
    }
    
    displayStatus(finalMessage, color);
    
    // Reset game elements
    mainAddressEl.textContent = 'N/A';
    requiredHostsEl.textContent = 'N/A';
    subnetMaskEl.textContent = 'N/A';
    resetInputs();
    startMessageEl.style.display = 'block';
    
    // Reset progress bar
    progressBar.style.width = '0%';
    progressText.textContent = 'Round Progress: 0% (Question 0 of 10)';
    
    // Remove active class from difficulty buttons
    difficultyBtns.forEach(btn => btn.classList.remove('active'));
    
    // Show the flag if they've completed all questions
    if (gameState.currentQuestion >= gameState.totalQuestions) {
        flagContainerEl.classList.add('active');
    }
}

// Event Listeners
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        startGame(btn.id);
    });
});

allocateBtn.addEventListener('click', () => {
    if (gameState.gameActive) {
        checkAnswers();
    } else {
        displayStatus('Please select a difficulty level to start the game.', 'red');
    }
});

// CIDR Chart Modal
showCidrBtn.addEventListener('click', () => {
    cidrModal.style.display = 'block';
    
    // Populate the CIDR table if not already done
    if (cidrTableBody.children.length === 0) {
        populateCidrTable();
    }
});

closeModalBtn.addEventListener('click', () => {
    cidrModal.style.display = 'none';
});

// Help Modal
showHelpBtn.addEventListener('click', () => {
    helpModal.style.display = 'block';
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.style.display = 'none';
});

// Hint Button
showHintBtn.addEventListener('click', () => {
    hintContentEl.classList.toggle('active');
    if (hintContentEl.classList.contains('active')) {
        showHintBtn.textContent = 'Hide Hint';
    } else {
        showHintBtn.textContent = 'Show Hint';
    }
});

window.addEventListener('click', (event) => {
    if (event.target === cidrModal) {
        cidrModal.style.display = 'none';
    }
    if (event.target === helpModal) {
        helpModal.style.display = 'none';
    }
}); 