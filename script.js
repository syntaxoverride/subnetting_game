// DOM Elements
const difficultyBtns = document.querySelectorAll('.difficulty-btn');
const progressText = document.querySelector('.progress-text');
const progressBar = document.querySelector('.progress');
const mainAddressEl = document.getElementById('main-address');
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
const scenarioEl = document.getElementById('scenario-text');
const nextQuestionBtn = document.getElementById('next-question-btn');
const feedbackDetailEl = document.getElementById('feedback-detail');

// Game state
let gameState = {
    currentDifficulty: null,
    score: 0,
    currentQuestion: 0,
    totalQuestions: 10,
    requiredHosts: null,
    correctSubnetMask: null,
    correctFirstUsable: null,
    correctLastUsable: null,
    correctNetworkIp: null,
    correctBroadcastIp: null,
    correctCidrPrefix: null,
    allocatedSubnets: [],
    gameActive: false,
    awaitingNext: false,
    hintLevel: 0
};

// ============================================================
// Immersive scenarios for each difficulty level
// These give context to WHY the student is subnetting
// ============================================================
const scenarios = {
    beginner: [
        { title: "Small Office Setup", text: "A small law firm just leased new office space and needs a network for {hosts} workstations. You've been given the address block {block}. Calculate the subnet so the IT contractor can configure the router." },
        { title: "Home Lab Network", text: "You're setting up a home lab to practice for your CCNA exam. You want to create a subnet that supports {hosts} devices using the address block {block}. Figure out the correct addresses to configure your lab router." },
        { title: "Coffee Shop Wi-Fi", text: "A local coffee shop owner hired you to set up their guest Wi-Fi. They expect up to {hosts} connected devices at peak hours. Using the address block {block}, calculate the right subnet." },
        { title: "Classroom Network", text: "Your school is setting up a computer lab with {hosts} student workstations. The school's IT department assigned you the address block {block}. Determine the subnet boundaries for the lab." },
        { title: "Retail Store POS System", text: "A retail store needs a dedicated network for their {hosts} point-of-sale terminals and back-office computers. Configure the subnet using {block}." },
        { title: "Doctor's Office", text: "A medical clinic needs a secure subnet for {hosts} devices including workstations and a network printer. They've been assigned {block}. Set up the addressing." },
        { title: "Startup Office", text: "A tech startup just moved into their first office. They have {hosts} employees who each need a networked device. Their ISP gave them {block}. Plan the subnet." },
        { title: "Security Camera Network", text: "A warehouse needs to put {hosts} IP security cameras on an isolated subnet. The network admin has reserved {block} for this purpose. Calculate the addresses." },
        { title: "Guest Network Segment", text: "A hotel lobby needs a guest network for up to {hosts} devices. The main network admin allocated {block} for guests. Determine the usable address range." },
        { title: "Printer VLAN", text: "Your company wants to put all {hosts} network printers on their own VLAN. You've been given {block} from the corporate address space. Calculate the subnet." }
    ],
    intermediate: [
        { title: "Branch Office Deployment", text: "Your company is opening a new branch office that needs {hosts} IP addresses for workstations, printers, and VoIP phones. HQ assigned the address block {block}. Design the subnet." },
        { title: "Data Center Rack", text: "You're provisioning a new server rack in the data center. The rack will house {hosts} virtual machines that each need an IP. You have {block} available. Calculate the subnet." },
        { title: "Campus Building Network", text: "A university building is being renovated and needs network connectivity for {hosts} devices across multiple floors. The campus NOC allocated {block}. Plan the addressing." },
        { title: "Factory Floor IoT", text: "A manufacturing plant needs to connect {hosts} IoT sensors and controllers on the factory floor. The OT network team gave you {block}. Subnet it appropriately." },
        { title: "Hospital Wing Network", text: "A new hospital wing requires {hosts} network connections for medical devices, nursing stations, and patient entertainment systems. Using {block}, configure the subnet." },
        { title: "Warehouse Management", text: "A logistics company needs {hosts} IP addresses for barcode scanners, inventory kiosks, and management terminals across their warehouse. Your block is {block}." },
        { title: "Multi-Tenant Office", text: "You manage IT for a shared office building. One tenant needs a subnet for {hosts} devices. Their allocation from the building's address space is {block}." },
        { title: "Research Lab Cluster", text: "A university research lab is deploying a computing cluster that needs {hosts} addressable nodes. The IT department provided {block}. Set up the subnet." },
        { title: "Call Center Expansion", text: "A call center is adding {hosts} new VoIP workstations. The telecom team allocated {block} for this expansion. Calculate the addressing scheme." },
        { title: "Retail Chain Store", text: "A new store location in your retail chain needs {hosts} devices connected. Corporate assigned {block} from the master addressing plan. Subnet it." }
    ],
    advanced: [
        { title: "ISP Customer Allocation", text: "As an ISP engineer, you need to carve out a subnet for a business customer requiring {hosts} public IP addresses. Your available block is {block}. Calculate the exact allocation." },
        { title: "Cloud VPC Design", text: "You're architecting a Virtual Private Cloud for a client's production environment. The application tier needs {hosts} addressable instances. Your VPC block is {block}." },
        { title: "Enterprise Campus Core", text: "You're redesigning the core network for a large corporate campus. The main distribution layer needs {hosts} routable addresses. The enterprise block is {block}." },
        { title: "Multi-Site VPN", text: "Your company is connecting {hosts} remote sites via VPN. Each site needs a unique address, and you're working from the block {block}. Plan the tunnel addressing." },
        { title: "Government Network Segment", text: "A government agency requires a classified network segment supporting {hosts} endpoints. DISA allocated {block} for your enclave. Define the subnet precisely." },
        { title: "CDN Edge Node Deployment", text: "Your CDN is deploying edge nodes across a region, requiring {hosts} unique IP addresses. The NOC allocated {block}. Calculate the subnet for the deployment." },
        { title: "Carrier Network Planning", text: "As a network planner for a telecom carrier, you need to address {hosts} customer-facing interfaces from {block}. Every address matters at this scale." },
        { title: "Disaster Recovery Site", text: "You're building a DR site that mirrors production with {hosts} addressable systems. The DR network allocation is {block}. Get the subnetting right." },
        { title: "Smart City Infrastructure", text: "A municipality is deploying smart city sensors and controllers. Phase 1 requires {hosts} connected devices using the block {block}." },
        { title: "Financial Trading Floor", text: "A trading firm needs ultra-low-latency networking for {hosts} trading terminals and matching engines. The network block is {block}. Precision matters." }
    ]
};

// ============================================================
// CIDR Data for reference table
// ============================================================
const cidrData = [];
for (let i = 0; i <= 32; i++) {
    const netmaskBits = i;
    const hostBits = 32 - i;
    let usableIPs;
    let usableLabel;

    if (hostBits === 0) {
        usableIPs = 0;
        usableLabel = '1 address (host route)';
    } else if (hostBits === 1) {
        usableIPs = 0;
        usableLabel = '2 addresses (point-to-point, RFC 3021)';
    } else {
        usableIPs = Math.pow(2, hostBits) - 2;
        usableLabel = usableIPs.toLocaleString();
    }

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
        usableIPs: usableLabel,
        netmaskBits,
        hostBits
    });
}

// ============================================================
// IP Address utilities
// ============================================================
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

/**
 * Validate that a string is a properly formatted IPv4 address.
 * Returns true if valid, false otherwise.
 */
function isValidIpv4(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return false;
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) return false;
        // Reject leading zeros (e.g., "01" or "001")
        if (part.length > 1 && part[0] === '0') return false;
    }
    return true;
}

// BUG-01 FIX: Declare second/third BEFORE the while loop
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
        let first, second, third;
        do {
            first = Math.floor(Math.random() * 223) + 1;
            second = Math.floor(Math.random() * 256);
            third = Math.floor(Math.random() * 256);
        } while (
            first === 10 ||
            first === 127 ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168) ||
            first === 0
        );
        return `${first}.${second}.${third}.0`;
    }
}

function calculateSubnetInfo(networkAddress, cidrPrefix) {
    const netmaskInt = cidrPrefix === 0 ? 0 : (0xffffffff << (32 - cidrPrefix)) >>> 0;
    const netmask = intToIp(netmaskInt);
    const networkInt = ipToInt(networkAddress) & netmaskInt;
    const network = intToIp(networkInt);
    const broadcastInt = networkInt | (~netmaskInt >>> 0);
    const broadcast = intToIp(broadcastInt);
    const totalHosts = Math.pow(2, 32 - cidrPrefix);
    const usableHosts = totalHosts > 2 ? totalHosts - 2 : 0;
    const firstUsable = usableHosts > 0 ? intToIp(networkInt + 1) : network;
    const lastUsable = usableHosts > 0 ? intToIp(broadcastInt - 1) : broadcast;

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

// ============================================================
// BUG-02 & BUG-03 FIX: Question generation now derives CIDR
// from required hosts, ensuring the question is always solvable
// and internally consistent.
// ============================================================
function getRequiredCidrPrefix(requiredHosts) {
    const hostBits = Math.ceil(Math.log2(requiredHosts + 2));
    return 32 - hostBits;
}

function generateQuestion(difficulty) {
    let requiredHosts, baseIp;

    switch (difficulty) {
        case 'beginner':
            // Beginner: /24 to /28 subnets (small, manageable numbers)
            // Host counts that map to clean CIDR boundaries: /28=14, /27=30, /26=62, /25=126, /24=254
            requiredHosts = pickHostCount([6, 10, 14, 20, 25, 50, 60, 100, 120, 200]);
            baseIp = '192.168.1.0';
            break;
        case 'intermediate':
            requiredHosts = pickHostCount([30, 60, 100, 200, 300, 500, 1000, 2000, 4000, 8000]);
            baseIp = generateRandomIpv4();
            break;
        case 'advanced':
            requiredHosts = pickHostCount([50, 200, 500, 1000, 4000, 8000, 16000, 32000, 65000, 100000]);
            baseIp = generateRandomIpv4();
            break;
    }

    // Derive the correct CIDR prefix from the host requirement
    const cidrPrefix = getRequiredCidrPrefix(requiredHosts);

    // BUG-07 FIX: Never generate /31 or /32 — they have no usable host range
    // This is guaranteed by our host count arrays (minimum 6 hosts → /29 at smallest)

    // Calculate subnet info using the derived CIDR applied to the base IP
    const subnetInfo = calculateSubnetInfo(baseIp, cidrPrefix);

    return {
        mainAddressBlock: `${subnetInfo.network}/${cidrPrefix}`,
        requiredHosts,
        networkIp: subnetInfo.network,
        subnetMask: subnetInfo.netmask,
        broadcastIp: subnetInfo.broadcast,
        firstUsable: subnetInfo.firstUsable,
        lastUsable: subnetInfo.lastUsable,
        cidrPrefix,
        usableHosts: subnetInfo.usableHosts
    };
}

/**
 * Pick a random host count from a curated list, with some jitter
 * to avoid always landing on exact powers-of-2 boundaries.
 */
function pickHostCount(options) {
    const base = options[Math.floor(Math.random() * options.length)];
    // Add small random jitter (stay within the same CIDR bracket)
    const cidr = getRequiredCidrPrefix(base);
    const maxForCidr = Math.pow(2, 32 - cidr) - 2;
    const minForNextSmaller = cidr < 31 ? Math.pow(2, 32 - cidr - 1) - 2 + 1 : 1;
    // Keep the jittered value within the same CIDR range
    const jitter = Math.floor(Math.random() * Math.max(1, Math.min(base * 0.2, maxForCidr - base)));
    const result = Math.min(base + jitter, maxForCidr);
    return Math.max(result, 1);
}

// ============================================================
// UI Updates
// ============================================================
function updateProgressBar() {
    const progress = (gameState.currentQuestion / gameState.totalQuestions) * 100;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `Round Progress: ${Math.round(progress)}% (Question ${gameState.currentQuestion} of ${gameState.totalQuestions})`;
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
    // Remove any per-field feedback styling
    [firstUsableInput, lastUsableInput, networkIpInput, broadcastIpInput].forEach(input => {
        input.style.borderColor = '#ddd';
        input.style.backgroundColor = '';
    });
}

function populateCidrTable() {
    cidrTableBody.innerHTML = '';

    cidrData.forEach(data => {
        const row = document.createElement('tr');
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

// PED-01 & PED-02 FIX: Corrected class labels and examples
function generateSubnetExamples(cidrPrefix) {
    const prefix = parseInt(cidrPrefix.substring(1));

    if (prefix === 0) {
        return "0.0.0.0/0 (default route / entire Internet)";
    }

    if (prefix === 32) {
        return "/32 (single host route, e.g., loopback or host-specific ACL)";
    }

    if (prefix === 31) {
        return "/31 (point-to-point link, RFC 3021 — no broadcast)";
    }

    let subnets = [];

    if (prefix === 8) {
        subnets.push("10.0.0.0/8 (Private — RFC 1918)");
        subnets.push("44.0.0.0/8 (AMPRNet)");
        subnets.push("100.0.0.0/8");
        return subnets.join("<br>");
    }

    if (prefix === 16) {
        subnets.push("172.16.0.0/16 (Private — RFC 1918, Class B range)");
        subnets.push("192.168.0.0/16 (Private — RFC 1918, Class C addresses, /16 block)");
        subnets.push("10.0.0.0/16, 10.1.0.0/16, ...");
        return subnets.join("<br>");
    }

    if (prefix === 24) {
        subnets.push("192.168.1.0/24 (Common Private LAN)");
        subnets.push("192.168.0.0/24, 192.168.2.0/24, ...");
        subnets.push("10.0.0.0/24, 10.0.1.0/24, ...");
        return subnets.join("<br>");
    }

    if (prefix > 24 && prefix <= 30) {
        const blockSize = Math.pow(2, 32 - prefix);
        const subnetCount = Math.pow(2, prefix - 24);

        subnets.push(`<strong>${subnetCount} subnets fit inside a /24 (block size: ${blockSize}):</strong>`);

        const maxToShow = Math.min(8, subnetCount);
        for (let i = 0; i < maxToShow; i++) {
            const fourthOctet = i * blockSize;
            subnets.push(`192.168.1.${fourthOctet}/${prefix}`);
        }

        if (maxToShow < subnetCount) {
            subnets.push(`... (${subnetCount - maxToShow} more)`);
        }

        return subnets.join("<br>");
    }

    if (prefix > 8 && prefix < 16) {
        const subnetCount = Math.pow(2, prefix - 8);
        subnets.push(`<strong>${subnetCount} subnets fit inside a /8:</strong>`);

        const secondOctetIncrement = 256 / subnetCount;
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            const secondOctet = Math.floor(i * secondOctetIncrement);
            subnets.push(`10.${secondOctet}.0.0/${prefix}`);
        }

        if (subnetCount > 4) {
            subnets.push(`... (${subnetCount - 4} more)`);
        }

        return subnets.join("<br>");
    }

    if (prefix > 16 && prefix < 24) {
        const subnetCount = Math.pow(2, prefix - 16);
        subnets.push(`<strong>${subnetCount} subnets fit inside a /16:</strong>`);

        const thirdOctetIncrement = 256 / subnetCount;
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            const thirdOctet = Math.floor(i * thirdOctetIncrement);
            subnets.push(`192.168.${thirdOctet}.0/${prefix}`);
        }

        if (subnetCount > 4) {
            subnets.push(`... (${subnetCount - 4} more)`);
        }

        return subnets.join("<br>");
    }

    if (prefix < 8) {
        if (prefix === 1) {
            return "0.0.0.0/1 (half the Internet)<br>128.0.0.0/1 (other half)";
        }

        const subnetCount = Math.pow(2, prefix);
        subnets.push(`<strong>${subnetCount} possible subnets:</strong>`);

        const increment = Math.pow(2, 8 - prefix);
        for (let i = 0; i < Math.min(3, subnetCount); i++) {
            const firstOctet = i * increment;
            subnets.push(`${firstOctet}.0.0.0/${prefix}`);
        }

        if (subnetCount > 3) {
            subnets.push(`... (${subnetCount - 3} more)`);
        }

        return subnets.join("<br>");
    }

    return "Examples not available";
}

function visualizeAddressBlock(networkAddress, cidrPrefix) {
    if (!addressVisualizationEl) return;

    const networkBits = cidrPrefix;
    const hostBits = 32 - networkBits;
    const usableHosts = Math.pow(2, hostBits) - 2;

    const ipParts = networkAddress.split('.');
    const binaryParts = ipParts.map(part => parseInt(part).toString(2).padStart(8, '0'));
    const binaryString = binaryParts.join('');

    const formattedBinary = [
        binaryString.slice(0, 8),
        binaryString.slice(8, 16),
        binaryString.slice(16, 24),
        binaryString.slice(24, 32)
    ].join('.');

    let formattedDisplay = '';

    for (let i = 0; i < formattedBinary.length; i++) {
        const char = formattedBinary[i];
        const currentBitIndex = i - Math.floor(i / 9);

        if (char === '.') {
            formattedDisplay += '.';
        } else if (currentBitIndex < networkBits) {
            formattedDisplay += `<span style="color: #007bff; font-weight: bold;">${char}</span>`;
        } else {
            formattedDisplay += `<span style="color: #dc3545;">${char}</span>`;
        }
    }

    addressVisualizationEl.innerHTML = `
        <div>${formattedDisplay}</div>
        <div style="font-size: 12px; margin-top: 8px;">
            <span style="color: #007bff; font-weight: bold;">Network Bits (${networkBits})</span> |
            <span style="color: #dc3545;">Host Bits (${hostBits})</span>
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
            Usable Hosts: ${usableHosts > 0 ? usableHosts.toLocaleString() : '0'}
        </div>
    `;
}

// ============================================================
// Game Logic
// ============================================================
function startGame(difficulty) {
    gameState.currentDifficulty = difficulty;
    gameState.score = 0;
    gameState.currentQuestion = 0;
    gameState.allocatedSubnets = [];
    gameState.gameActive = true;
    gameState.awaitingNext = false;

    scoreEl.textContent = '0';
    startMessageEl.style.display = 'none';
    if (feedbackDetailEl) feedbackDetailEl.style.display = 'none';
    if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
    resetInputs();
    updateProgressBar();

    // Hide the flag from any previous game
    flagContainerEl.classList.remove('active');

    difficultyBtns.forEach(btn => btn.classList.remove('active'));
    document.getElementById(difficulty).classList.add('active');

    nextQuestion();
}

function nextQuestion() {
    if (gameState.currentQuestion >= gameState.totalQuestions) {
        endGame();
        return;
    }

    gameState.awaitingNext = false;
    if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
    if (feedbackDetailEl) {
        feedbackDetailEl.style.display = 'none';
        feedbackDetailEl.innerHTML = '';
    }

    const question = generateQuestion(gameState.currentDifficulty);

    // Store correct answers in game state for validation
    gameState.requiredHosts = question.requiredHosts;
    gameState.correctNetworkIp = question.networkIp;
    gameState.correctSubnetMask = question.subnetMask;
    gameState.correctBroadcastIp = question.broadcastIp;
    gameState.correctFirstUsable = question.firstUsable;
    gameState.correctLastUsable = question.lastUsable;
    gameState.correctCidrPrefix = question.cidrPrefix;

    // Update UI
    mainAddressEl.textContent = question.mainAddressBlock;
    requiredHostsEl.textContent = question.requiredHosts.toLocaleString();
    subnetMaskEl.textContent = question.subnetMask;

    // Show immersive scenario
    if (scenarioEl) {
        const scenarioList = scenarios[gameState.currentDifficulty];
        const scenario = scenarioList[gameState.currentQuestion % scenarioList.length];
        scenarioEl.innerHTML = `<strong>${scenario.title}:</strong> ${scenario.text
            .replace('{hosts}', question.requiredHosts.toLocaleString())
            .replace('{block}', question.mainAddressBlock)}`;
    }

    // Build guided walkthrough hint (BUG-06 FIX: no answers revealed)
    updateHint(question);

    // Visualize the address block
    visualizeAddressBlock(question.networkIp, question.cidrPrefix);

    // BUG-05 FIX: Placeholders are generic examples, NOT the actual answers
    firstUsableInput.placeholder = 'e.g., 192.168.1.1';
    lastUsableInput.placeholder = 'e.g., 192.168.1.254';
    networkIpInput.placeholder = 'e.g., 192.168.1.0';
    broadcastIpInput.placeholder = 'e.g., 192.168.1.255';

    resetInputs();
    displayStatus('Read the scenario and calculate the subnet addresses.');
    gameState.hintLevel = 0;

    gameState.currentQuestion++;
    updateProgressBar();
}

// ============================================================
// BUG-06 FIX: Guided, multi-level hint system
// Level 1 = conceptual guidance
// Level 2 = worked steps (no final answer)
// Level 3 = reveal answer (after two attempts at thinking)
// ============================================================
function updateHint(question) {
    if (!subnetHintEl) return;

    const requiredHosts = question.requiredHosts;
    const cidrPrefix = question.cidrPrefix;
    const hostBits = 32 - cidrPrefix;
    const blockSize = Math.pow(2, hostBits);
    const usableHosts = question.usableHosts;

    showHintBtn.textContent = 'Show Hint (Level 1)';
    hintContentEl.classList.remove('active');
    gameState.hintLevel = 0;

    // Build all 3 levels of hint
    const hintLevels = [];

    // ---- LEVEL 1: Conceptual guidance (no numbers specific to the answer) ----
    let h1 = `<strong>Hint Level 1 — How to Approach This</strong><br><br>`;
    h1 += `<strong>Step 1:</strong> Figure out how many host bits you need.<br>`;
    h1 += `You need at least <strong>${requiredHosts}</strong> usable addresses. Remember, each subnet reserves 2 addresses (network + broadcast), so you need room for hosts + 2.<br><br>`;
    h1 += `<strong>Step 2:</strong> Use the formula: 2<sup>n</sup> &ge; ${requiredHosts} + 2, where <em>n</em> is the number of host bits.<br><br>`;
    h1 += `<strong>Step 3:</strong> Once you know <em>n</em>, the CIDR prefix = 32 - <em>n</em>. Use that prefix to find the subnet mask, then calculate the network, broadcast, and usable range.<br><br>`;
    h1 += `<strong>Quick reference:</strong>`;
    h1 += `<table class="subnet-table">
        <tr><th>CIDR</th><th>Host Bits</th><th>Usable Hosts</th><th>Subnet Mask</th><th>Block Size<br><small>(addresses per subnet)</small></th></tr>
        <tr><td>/24</td><td>8</td><td>254</td><td>255.255.255.0</td><td>256</td></tr>
        <tr><td>/25</td><td>7</td><td>126</td><td>255.255.255.128</td><td>128</td></tr>
        <tr><td>/26</td><td>6</td><td>62</td><td>255.255.255.192</td><td>64</td></tr>
        <tr><td>/27</td><td>5</td><td>30</td><td>255.255.255.224</td><td>32</td></tr>
        <tr><td>/28</td><td>4</td><td>14</td><td>255.255.255.240</td><td>16</td></tr>
        <tr><td>/29</td><td>3</td><td>6</td><td>255.255.255.248</td><td>8</td></tr>
        <tr><td>/30</td><td>2</td><td>2</td><td>255.255.255.252</td><td>4</td></tr>
    </table>`;
    hintLevels.push(h1);

    // ---- LEVEL 2: Worked steps with partial answer ----
    let h2 = `<strong>Hint Level 2 — Worked Steps</strong><br><br>`;
    h2 += `<strong>Step 1:</strong> You need ${requiredHosts} hosts. Adding 2 for network and broadcast: ${requiredHosts} + 2 = ${requiredHosts + 2}.<br><br>`;
    h2 += `<strong>Step 2:</strong> Find the smallest power of 2 that is &ge; ${requiredHosts + 2}:<br>`;
    h2 += `2<sup>${hostBits}</sup> = ${blockSize} &ge; ${requiredHosts + 2} &check;<br>`;
    h2 += `So you need <strong>${hostBits} host bits</strong>.<br><br>`;
    h2 += `<strong>Step 3:</strong> CIDR prefix = 32 - ${hostBits} = <strong>/${cidrPrefix}</strong><br>`;
    h2 += `Subnet mask: <strong>${question.subnetMask}</strong><br><br>`;
    h2 += `<strong>Step 4:</strong> Now apply /${cidrPrefix} to the network address shown above. The network address is the base, then:<br>`;
    h2 += `&bull; First usable = network address + 1<br>`;
    h2 += `&bull; Broadcast = network address + ${blockSize} - 1<br>`;
    h2 += `&bull; Last usable = broadcast - 1<br><br>`;
    h2 += `<em>Try to work it out from here! Click the hint button again if you need the full answer.</em>`;
    hintLevels.push(h2);

    // ---- LEVEL 3: Full answer reveal ----
    let h3 = `<strong>Hint Level 3 — Full Answer</strong><br><br>`;
    h3 += `<table class="subnet-table">
        <tr><th>Field</th><th>Value</th><th>How to Calculate</th></tr>
        <tr><td>Network IP</td><td><strong>${question.networkIp}</strong></td><td>Base address with host bits all 0</td></tr>
        <tr><td>First Usable</td><td><strong>${question.firstUsable}</strong></td><td>Network IP + 1</td></tr>
        <tr><td>Last Usable</td><td><strong>${question.lastUsable}</strong></td><td>Broadcast IP - 1</td></tr>
        <tr><td>Broadcast</td><td><strong>${question.broadcastIp}</strong></td><td>Network IP + ${blockSize - 1} (host bits all 1)</td></tr>
    </table><br>`;
    h3 += `<strong>Explanation:</strong> The /${cidrPrefix} prefix means ${cidrPrefix} network bits and ${hostBits} host bits. `;
    h3 += `The block size is 2<sup>${hostBits}</sup> = ${blockSize}. The network starts at ${question.networkIp}, `;
    h3 += `so the broadcast is ${blockSize - 1} addresses later at ${question.broadcastIp}. `;
    h3 += `The usable range is everything between those two addresses.`;
    hintLevels.push(h3);

    // Store hint levels on the element for the toggle handler
    subnetHintEl._hintLevels = hintLevels;
    subnetHintEl.innerHTML = hintLevels[0];
}

// ============================================================
// BUG-02 FIX: Answer checking validates against stored correct
// answers, not derived from user input.
// BUG-04 FIX: Scoring awards points only for fields answered.
// ============================================================
function checkAnswers() {
    if (gameState.awaitingNext) return;

    const firstUsable = firstUsableInput.value.trim();
    const lastUsable = lastUsableInput.value.trim();
    const networkIp = networkIpInput.value.trim();
    const broadcastIp = broadcastIpInput.value.trim();

    if (!firstUsable || !lastUsable) {
        displayStatus('Please fill in at least the First Usable and Last Usable IP addresses.', 'red');
        return;
    }

    // UX-01 FIX: Validate IP format before checking correctness
    const fieldsToValidate = [
        { value: firstUsable, name: 'First Usable IP', el: firstUsableInput },
        { value: lastUsable, name: 'Last Usable IP', el: lastUsableInput }
    ];
    if (networkIp) fieldsToValidate.push({ value: networkIp, name: 'Network IP', el: networkIpInput });
    if (broadcastIp) fieldsToValidate.push({ value: broadcastIp, name: 'Broadcast IP', el: broadcastIpInput });

    for (const field of fieldsToValidate) {
        if (!isValidIpv4(field.value)) {
            displayStatus(`Invalid IP format for ${field.name}: "${field.value}". Use format like 192.168.1.0`, 'red');
            field.el.style.borderColor = '#dc3545';
            return;
        }
    }

    // Compare against the known correct answers stored in gameState
    let points = 0;
    let maxPossible = 4; // base: 2 (first) + 2 (last)
    let feedbackMessages = [];
    let correctCount = 0;
    let totalChecked = 2; // always check first and last

    // Check first usable IP (2 points)
    if (firstUsable === gameState.correctFirstUsable) {
        points += 2;
        correctCount++;
        firstUsableInput.style.borderColor = '#28a745';
        firstUsableInput.style.backgroundColor = '#f0fff0';
    } else {
        firstUsableInput.style.borderColor = '#dc3545';
        firstUsableInput.style.backgroundColor = '#fff0f0';
        feedbackMessages.push({ field: 'First Usable IP', yours: firstUsable, correct: gameState.correctFirstUsable });
    }

    // Check last usable IP (2 points)
    if (lastUsable === gameState.correctLastUsable) {
        points += 2;
        correctCount++;
        lastUsableInput.style.borderColor = '#28a745';
        lastUsableInput.style.backgroundColor = '#f0fff0';
    } else {
        lastUsableInput.style.borderColor = '#dc3545';
        lastUsableInput.style.backgroundColor = '#fff0f0';
        feedbackMessages.push({ field: 'Last Usable IP', yours: lastUsable, correct: gameState.correctLastUsable });
    }

    // Check network IP if provided (1 point)
    if (networkIp) {
        maxPossible += 1;
        totalChecked++;
        if (networkIp === gameState.correctNetworkIp) {
            points += 1;
            correctCount++;
            networkIpInput.style.borderColor = '#28a745';
            networkIpInput.style.backgroundColor = '#f0fff0';
        } else {
            networkIpInput.style.borderColor = '#dc3545';
            networkIpInput.style.backgroundColor = '#fff0f0';
            feedbackMessages.push({ field: 'Network IP', yours: networkIp, correct: gameState.correctNetworkIp });
        }
    }

    // Check broadcast IP if provided (1 point)
    if (broadcastIp) {
        maxPossible += 1;
        totalChecked++;
        if (broadcastIp === gameState.correctBroadcastIp) {
            points += 1;
            correctCount++;
            broadcastIpInput.style.borderColor = '#28a745';
            broadcastIpInput.style.backgroundColor = '#f0fff0';
        } else {
            broadcastIpInput.style.borderColor = '#dc3545';
            broadcastIpInput.style.backgroundColor = '#fff0f0';
            feedbackMessages.push({ field: 'Broadcast IP', yours: broadcastIp, correct: gameState.correctBroadcastIp });
        }
    }

    // BUG-04 FIX: Award exactly the points earned — no special "perfect" override
    updateScore(points);

    // Build detailed feedback
    if (feedbackMessages.length === 0) {
        if (totalChecked === 4) {
            displayStatus(`Perfect! All ${totalChecked} fields correct. +${points} points`, 'green');
        } else {
            displayStatus(`Correct! ${correctCount}/${totalChecked} fields right. +${points}/${maxPossible} points (fill in all 4 fields for max points!)`, 'green');
        }
    } else {
        displayStatus(`${correctCount}/${totalChecked} correct. +${points} points. Review the corrections below.`, 'orange');
    }

    // Show detailed feedback panel
    if (feedbackDetailEl) {
        let html = '';
        if (feedbackMessages.length > 0) {
            html += '<div class="feedback-corrections">';
            html += '<strong>Corrections:</strong><br>';
            for (const fb of feedbackMessages) {
                html += `<div class="feedback-row">`;
                html += `<span class="feedback-label">${fb.field}:</span> `;
                html += `<span class="feedback-wrong">Your answer: ${fb.yours}</span> → `;
                html += `<span class="feedback-correct">Correct: ${fb.correct}</span>`;
                html += `</div>`;
            }
            html += '</div>';
        }

        // Always show the full solution breakdown after answering
        html += '<div class="feedback-explanation">';
        html += `<strong>Solution breakdown for /${gameState.correctCidrPrefix}:</strong><br>`;
        html += `<table class="subnet-table">
            <tr><th>Field</th><th>Value</th></tr>
            <tr><td>Network IP</td><td>${gameState.correctNetworkIp}</td></tr>
            <tr><td>First Usable</td><td>${gameState.correctFirstUsable}</td></tr>
            <tr><td>Last Usable</td><td>${gameState.correctLastUsable}</td></tr>
            <tr><td>Broadcast</td><td>${gameState.correctBroadcastIp}</td></tr>
            <tr><td>Subnet Mask</td><td>${gameState.correctSubnetMask}</td></tr>
            <tr><td>Usable Hosts</td><td>${(Math.pow(2, 32 - gameState.correctCidrPrefix) - 2).toLocaleString()}</td></tr>
        </table>`;
        html += '</div>';

        feedbackDetailEl.innerHTML = html;
        feedbackDetailEl.style.display = 'block';
    }

    // Record this subnet
    gameState.allocatedSubnets.push({
        network: gameState.correctNetworkIp,
        cidrPrefix: gameState.correctCidrPrefix,
        hosts: gameState.requiredHosts
    });

    // UX-05 FIX: Show a "Next Question" button instead of auto-advancing
    gameState.awaitingNext = true;
    if (nextQuestionBtn) {
        nextQuestionBtn.style.display = 'inline-block';
        nextQuestionBtn.focus();
    }
}

function endGame() {
    gameState.gameActive = false;
    gameState.awaitingNext = false;

    const maxScore = gameState.totalQuestions * 6;
    const scorePercentage = Math.round((gameState.score / maxScore) * 100);

    let finalMessage, color;

    if (scorePercentage >= 90) {
        finalMessage = `Outstanding! Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). You've mastered subnetting!`;
        color = 'green';
    } else if (scorePercentage >= 70) {
        finalMessage = `Great work! Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). Solid subnetting skills.`;
        color = 'blue';
    } else if (scorePercentage >= 50) {
        finalMessage = `Good effort! Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). Keep practicing!`;
        color = 'orange';
    } else {
        finalMessage = `Final score: ${gameState.score}/${maxScore} (${scorePercentage}%). Subnetting takes practice — try again!`;
        color = 'red';
    }

    displayStatus(finalMessage, color);

    mainAddressEl.textContent = 'N/A';
    requiredHostsEl.textContent = 'N/A';
    subnetMaskEl.textContent = 'N/A';
    if (scenarioEl) scenarioEl.innerHTML = '';
    resetInputs();
    startMessageEl.style.display = 'block';
    if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';

    progressBar.style.width = '100%';
    progressText.textContent = `Round Complete! Final Score: ${gameState.score}/${maxScore}`;

    difficultyBtns.forEach(btn => btn.classList.remove('active'));

    if (gameState.currentQuestion >= gameState.totalQuestions) {
        flagContainerEl.classList.add('active');
    }
}

// ============================================================
// Event Listeners
// ============================================================
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        startGame(btn.id);
    });
});

allocateBtn.addEventListener('click', () => {
    if (gameState.awaitingNext) {
        nextQuestion();
        return;
    }
    if (gameState.gameActive) {
        checkAnswers();
    } else {
        displayStatus('Please select a difficulty level to start the game.', 'red');
    }
});

// UX-02 FIX: Enter key submits the answer or advances to next question
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && gameState.gameActive) {
        e.preventDefault();
        if (gameState.awaitingNext) {
            nextQuestion();
        } else {
            checkAnswers();
        }
    }
});

// Next Question button handler
if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', () => {
        nextQuestion();
    });
}

// CIDR Chart Modal
showCidrBtn.addEventListener('click', () => {
    cidrModal.style.display = 'block';
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

// Hint Button — cycles through hint levels
showHintBtn.addEventListener('click', () => {
    const levels = subnetHintEl._hintLevels;
    if (!levels) return;

    if (!hintContentEl.classList.contains('active')) {
        // First click: show level 1
        hintContentEl.classList.add('active');
        gameState.hintLevel = 0;
        subnetHintEl.innerHTML = levels[0];
        showHintBtn.textContent = 'More Help (Level 2)';
    } else if (gameState.hintLevel === 0) {
        // Second click: show level 2
        gameState.hintLevel = 1;
        subnetHintEl.innerHTML = levels[1];
        showHintBtn.textContent = 'Show Answer (Level 3)';
    } else if (gameState.hintLevel === 1) {
        // Third click: show level 3
        gameState.hintLevel = 2;
        subnetHintEl.innerHTML = levels[2];
        showHintBtn.textContent = 'Hide Hint';
    } else {
        // Fourth click: hide
        hintContentEl.classList.remove('active');
        gameState.hintLevel = 0;
        showHintBtn.textContent = 'Show Hint (Level 1)';
    }
});

// Close modals by clicking outside
window.addEventListener('click', (event) => {
    if (event.target === cidrModal) {
        cidrModal.style.display = 'none';
    }
    if (event.target === helpModal) {
        helpModal.style.display = 'none';
    }
});
