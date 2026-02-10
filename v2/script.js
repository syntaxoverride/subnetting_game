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
const validationMsgEl = document.getElementById('validation-message');
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
const flagDisplayEl = document.getElementById('flag-display');
const scenarioEl = document.getElementById('scenario-text');
const nextQuestionBtn = document.getElementById('next-question-btn');
const feedbackDetailEl = document.getElementById('feedback-detail');
const ipNoteEl = document.getElementById('ip-note');

// Encrypted flags (AES-256-GCM) — v2 flags, one per difficulty
const ENCRYPTED_FLAGS = {
    beginner:     'd7b6c55e59162209c06995edefedcf714be95e16ef75a684ba8612c4ee5ddee8addd6886a7f8b220a21d056755e26bc91f2394c7b1fd90',
    intermediate: '8767dda18c6b8cda81b21746097097079b2e2c1b36c4a6b8970e58edae0ddc7d0049975a8b2e7f57beebd4f7a0a9879ed0465ea363cf',
    advanced:     'e9aa39723a365f5f2e9d8f31f565cfdfe7a721e32379cbd188ae914784d4a57ded150b4d0c71d6d36afc857347d2909094d4585ee1b3dbcae4'
};
const FLAG_SALT = 'subnet-challenge-v2-2024';

async function decryptFlag(difficulty) {
    try {
        const hexStr = ENCRYPTED_FLAGS[difficulty];
        if (!hexStr) return null;
        const data = new Uint8Array(hexStr.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const iv = data.slice(0, 12);
        const authTag = data.slice(12, 28);
        const ciphertext = data.slice(28);
        const encryptedWithTag = new Uint8Array(ciphertext.length + authTag.length);
        encryptedWithTag.set(ciphertext);
        encryptedWithTag.set(authTag, ciphertext.length);
        const encoder = new TextEncoder();
        const passphrase = 'net-' + difficulty + '-flag-v2';
        const keyMaterial = await crypto.subtle.importKey(
            'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: encoder.encode(FLAG_SALT), iterations: 100000, hash: 'SHA-256' },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv }, key, encryptedWithTag
        );
        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return null;
    }
}

// Game state
let gameState = {
    currentDifficulty: null,
    currentQuestion: 0,
    totalQuestions: 20,
    requiredHosts: null,
    correctSubnetMask: null,
    correctFirstUsable: null,
    correctLastUsable: null,
    correctNetworkIp: null,
    correctBroadcastIp: null,
    correctCidrPrefix: null,
    givenIp: null,
    allocatedSubnets: [],
    gameActive: false,
    awaitingNext: false,
    hintLevel: 0,
    questionStartTime: null,
    hintCountdownInterval: null
};

// Hint unlock delays (seconds from question start)
const HINT_UNLOCK_TIMES = [60, 150, 240];
const HINT_LABELS = ['Show Hint (Level 1)', 'More Help (Level 2)', 'Show Answer (Level 3)'];

function formatCountdown(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, '0')}s` : `${s}s`;
}

function getAvailableHintLevel() {
    if (!gameState.questionStartTime) return -1;
    const elapsed = (Date.now() - gameState.questionStartTime) / 1000;
    if (elapsed >= HINT_UNLOCK_TIMES[2]) return 3;
    if (elapsed >= HINT_UNLOCK_TIMES[1]) return 2;
    if (elapsed >= HINT_UNLOCK_TIMES[0]) return 1;
    return 0;
}

function getSecondsUntilNextHint() {
    if (!gameState.questionStartTime) return 0;
    const elapsed = (Date.now() - gameState.questionStartTime) / 1000;
    let nextNeededLevel;
    if (!hintContentEl.classList.contains('active')) {
        nextNeededLevel = 0;
    } else if (gameState.hintLevel === 0) {
        nextNeededLevel = 1;
    } else if (gameState.hintLevel === 1) {
        nextNeededLevel = 2;
    } else {
        return 0;
    }
    const unlockTime = HINT_UNLOCK_TIMES[nextNeededLevel];
    const remaining = Math.ceil(unlockTime - elapsed);
    return remaining > 0 ? remaining : 0;
}

function updateHintButtonState() {
    const remaining = getSecondsUntilNextHint();
    if (remaining > 0) {
        let label;
        if (!hintContentEl.classList.contains('active')) label = HINT_LABELS[0];
        else if (gameState.hintLevel === 0) label = HINT_LABELS[1];
        else if (gameState.hintLevel === 1) label = HINT_LABELS[2];
        else label = 'Hide Hints';
        showHintBtn.textContent = `${label} (${formatCountdown(remaining)})`;
        showHintBtn.disabled = true;
        showHintBtn.classList.add('hint-locked');
    } else {
        if (!hintContentEl.classList.contains('active')) showHintBtn.textContent = HINT_LABELS[0];
        else if (gameState.hintLevel === 0) showHintBtn.textContent = HINT_LABELS[1];
        else if (gameState.hintLevel === 1) showHintBtn.textContent = HINT_LABELS[2];
        else showHintBtn.textContent = 'Hide Hints';
        showHintBtn.disabled = false;
        showHintBtn.classList.remove('hint-locked');
    }
}

function startHintCountdown() {
    if (gameState.hintCountdownInterval) clearInterval(gameState.hintCountdownInterval);
    gameState.questionStartTime = Date.now();
    updateHintButtonState();
    gameState.hintCountdownInterval = setInterval(() => {
        updateHintButtonState();
        if (gameState.hintLevel === 2 || !gameState.gameActive) {
            clearInterval(gameState.hintCountdownInterval);
            gameState.hintCountdownInterval = null;
        }
    }, 1000);
}

function stopHintCountdown() {
    if (gameState.hintCountdownInterval) {
        clearInterval(gameState.hintCountdownInterval);
        gameState.hintCountdownInterval = null;
    }
}

// ============================================================
// v2 Scenarios — more technical, enterprise/infrastructure focus
// ============================================================
const scenarios = {
    beginner: [
        { title: "Corporate VLAN Redesign", text: "Your company is reorganizing its VLANs. A department with {hosts} devices has been assigned the address space containing {block}. Identify the subnet boundaries." },
        { title: "Campus Wi-Fi Upgrade", text: "A university is upgrading Wi-Fi across a building that needs {hosts} device connections. A network engineer flagged the IP {block} as part of the allocation. Find the subnet." },
        { title: "Branch Office Migration", text: "Your branch office is migrating to a new address scheme. A router interface is configured with {block} and needs to serve {hosts} hosts. Calculate the subnet boundaries." },
        { title: "Server Farm Segment", text: "A server room has {hosts} virtual machines on a segment. One VM's address is {block}. Determine the full subnet range." },
        { title: "Medical Device Network", text: "A hospital floor has {hosts} networked medical devices. The DHCP server shows {block} as an active lease. What subnet are these devices on?" },
        { title: "Retail Backhaul Link", text: "A retail chain's WAN connection shows {block} on a router interface serving {hosts} store devices. Identify the network boundaries." },
        { title: "School District Deployment", text: "A school district needs {hosts} addresses for a new building. The IT coordinator received {block} as a reference IP in the allocation. Find the subnet." },
        { title: "Warehouse IoT Rollout", text: "A warehouse is deploying {hosts} IoT sensors. The controller has been assigned {block}. Calculate the subnet range these sensors will use." },
        { title: "VoIP Phone Network", text: "A call center with {hosts} VoIP phones is on a dedicated VLAN. A phone registered with address {block}. Determine the VLAN's subnet." },
        { title: "Guest Wi-Fi Isolation", text: "A hotel's guest Wi-Fi supports {hosts} devices. The captive portal server is at {block}. What are the subnet boundaries?" },
        { title: "Security Camera VLAN", text: "A building has {hosts} IP cameras on a security VLAN. The NVR is addressed at {block}. Calculate the camera subnet range." },
        { title: "Point-of-Sale Network", text: "A restaurant chain has {hosts} POS terminals across a location. The payment gateway shows {block}. Find the subnet these terminals are on." },
        { title: "Print Server Segment", text: "An office has {hosts} networked printers on a dedicated segment. The print server is at {block}. What is the subnet?" },
        { title: "Building Management System", text: "A smart building has {hosts} HVAC and lighting controllers. The BMS console at {block} manages them. Calculate the subnet." },
        { title: "Lab Workstation Network", text: "A research lab needs {hosts} workstation connections. A new machine was assigned {block}. Determine the lab's subnet boundaries." },
        { title: "Parking Garage Network", text: "A parking garage has {hosts} license plate readers and payment kiosks. The central controller is at {block}. Find the subnet." },
        { title: "Digital Signage Network", text: "A stadium has {hosts} digital signs on a dedicated network. The content server is at {block}. Calculate the subnet range." },
        { title: "Clinic Records System", text: "A medical clinic has {hosts} devices for electronic health records. A workstation at {block} needs the subnet configured. Find it." },
        { title: "Coworking Space Wi-Fi", text: "A coworking space supports {hosts} concurrent devices. A member reported connectivity issues from {block}. What subnet is this?" },
        { title: "Public Library Network", text: "A library needs {hosts} connections for public computers and staff devices. The DHCP server is leasing addresses around {block}. Find the subnet." },
        { title: "Fire Station Network", text: "A fire station has {hosts} devices including dispatch terminals and MDTs. A terminal at {block} needs subnet info for a static route. Calculate it." }
    ],
    intermediate: [
        { title: "Multi-Floor Enterprise", text: "A 10-floor office building needs {hosts} addresses per floor segment. A switch on floor 7 reports {block}. Determine the subnet for this floor." },
        { title: "Data Center Pod", text: "You're provisioning a data center pod with {hosts} servers. The top-of-rack switch is configured with {block}. Find the pod's subnet boundaries." },
        { title: "ISP Customer Block", text: "An ISP customer was allocated a block for {hosts} devices. Their edge router shows {block}. Calculate the exact subnet they were given." },
        { title: "SD-WAN Hub Site", text: "Your SD-WAN hub site needs {hosts} addresses for tunnel endpoints. The hub's interface is {block}. Determine the subnet." },
        { title: "University Department", text: "A university department with {hosts} users has an address allocation. A professor's workstation is at {block}. What subnet is this department on?" },
        { title: "Factory Automation", text: "A factory's automation network has {hosts} PLCs and HMIs. The SCADA server at {block} monitors all devices. Calculate the subnet." },
        { title: "Hospital Campus", text: "A hospital campus wing needs {hosts} addresses for medical devices and workstations. A nurse station at {block} needs routing configured. Find the subnet." },
        { title: "Cloud Transit VPC", text: "A cloud transit VPC needs {hosts} addresses for peering connections. The transit gateway has {block}. Determine the VPC subnet." },
        { title: "Convention Center Event", text: "A trade show needs {hosts} temporary connections. The event network shows {block} on the core switch. Calculate the subnet." },
        { title: "Telecom NOC", text: "A telecom NOC has {hosts} monitoring stations and servers. A monitoring probe at {block} needs the subnet configured. Find it." },
        { title: "Railway Signaling Network", text: "A railway section has {hosts} signaling controllers on a dedicated network. The master controller at {block} manages the segment. Calculate the subnet." },
        { title: "Airport Operations", text: "An airport terminal operations network needs {hosts} addresses. The flight information display at {block} is part of this subnet. Find its boundaries." },
        { title: "Carrier Ethernet Service", text: "A carrier Ethernet customer needs {hosts} addresses on their E-Line service. The CE router interface is {block}. Determine the subnet." },
        { title: "Smart Grid Distribution", text: "A power distribution network has {hosts} smart meters and RTUs. A concentrator at {block} aggregates their data. Find the subnet." },
        { title: "Maritime Port Network", text: "A container port needs {hosts} addresses for crane systems, AGVs, and terminal operations. The port MIS at {block} needs the subnet. Calculate it." },
        { title: "Sports Arena Network", text: "A sports arena needs {hosts} connections for cameras, scoreboards, and media. The production truck at {block} requires subnet info. Find it." },
        { title: "Mining Operations", text: "An underground mine has {hosts} connected sensors and communication relays. The surface gateway at {block} manages the network. Calculate the subnet." },
        { title: "Pharmaceutical Campus", text: "A pharma campus has {hosts} lab instruments and clean room controllers on one segment. A chromatograph at {block} is on this subnet. Find it." },
        { title: "Logistics Hub", text: "A logistics distribution center needs {hosts} addresses for scanners, conveyors, and management systems. The WMS server is at {block}. Calculate the subnet." },
        { title: "Broadcast Studio", text: "A TV broadcast facility needs {hosts} addresses for cameras, switchers, and playout systems. The master control at {block} needs the subnet. Find it." },
        { title: "Oil Pipeline SCADA", text: "An oil pipeline has {hosts} SCADA nodes across its length. The control center at {block} monitors all stations. Determine the subnet." }
    ],
    advanced: [
        { title: "Global CDN Deployment", text: "Your CDN is deploying {hosts} edge nodes worldwide. The anycast block includes {block}. Calculate the exact subnet for this deployment region." },
        { title: "Carrier Core Router", text: "As a carrier network engineer, you're addressing {hosts} interfaces on a core router. Interface Gi0/0/0 is {block}. Find the subnet." },
        { title: "IX Peering Fabric", text: "An Internet Exchange needs {hosts} addresses for its peering fabric. Your port on the fabric is {block}. Determine the IX subnet." },
        { title: "Hyperscale Compute", text: "A hyperscale data center is commissioning {hosts} bare-metal servers. A server in rack A01 has {block}. Calculate the compute subnet." },
        { title: "Military Enclave", text: "A classified military network requires {hosts} endpoints. A workstation in the SCIF at {block} needs exact subnet parameters. Define them." },
        { title: "5G User Plane", text: "A 5G UPF needs {hosts} addresses for PDU sessions. The N6 interface is {block}. Calculate the subnet for this UPF pool." },
        { title: "Satellite Constellation", text: "A LEO satellite constellation needs {hosts} addresses for ground station links. An earth station at {block} is part of the management network. Find the subnet." },
        { title: "Stock Exchange Matching", text: "A stock exchange's matching engine cluster needs {hosts} ultra-low-latency addresses. Engine #1 is at {block}. Determine the cluster subnet." },
        { title: "Autonomous Vehicle Mesh", text: "A fleet of {hosts} autonomous vehicles shares a mesh network. The fleet controller at {block} coordinates all vehicles. Calculate the subnet." },
        { title: "Submarine Cable System", text: "A submarine cable system needs {hosts} addresses for repeaters, BUs, and landing stations. A SLTE at {block} terminates the cable. Find the management subnet." },
        { title: "Nuclear Plant SCADA", text: "A nuclear plant's safety instrumentation network requires {hosts} addresses. The safety PLC at {block} is on a critical segment. Calculate the exact subnet." },
        { title: "Space Station Network", text: "The space station's onboard network needs {hosts} addresses for experiments, life support, and communications. A terminal at {block} needs routing. Find the subnet." },
        { title: "Quantum Research Lab", text: "A quantum computing lab needs {hosts} addresses for QPUs, control electronics, and analysis nodes. A dilution fridge controller at {block} is on this network. Calculate it." },
        { title: "National DNS Infrastructure", text: "A country's DNS infrastructure needs {hosts} addresses for recursive resolvers and authoritative servers. A resolver at {block} is in the allocation. Find the subnet." },
        { title: "Deep Sea Mining", text: "A deep-sea mining operation needs {hosts} addresses for ROVs, sensor arrays, and surface vessels. The command ship at {block} manages all systems. Calculate the subnet." },
        { title: "Formula 1 Telemetry", text: "An F1 team's trackside telemetry system needs {hosts} addresses for sensors, cameras, and strategy systems. The pit wall at {block} aggregates data. Find the subnet." },
        { title: "Air Traffic Control", text: "An ATC center needs {hosts} addresses for radar feeds, communication links, and controller workstations. A radar processor at {block} needs subnet info. Calculate it." },
        { title: "Genome Sequencing Cluster", text: "A genomics center's sequencing cluster needs {hosts} addresses for sequencers, storage nodes, and analysis servers. A node at {block} is in this cluster. Find the subnet." },
        { title: "Particle Accelerator", text: "A particle accelerator's control network needs {hosts} addresses for magnet controllers, beam monitors, and data acquisition. A BPM at {block} is on this segment." },
        { title: "Cryptocurrency Exchange", text: "A crypto exchange needs {hosts} addresses for matching engines, hot wallets, and API gateways. The primary matching engine at {block} needs precise subnetting." },
        { title: "Antarctic Research Station", text: "An Antarctic base needs {hosts} addresses for weather stations, satellite links, and research equipment. The comms hub at {block} connects everything. Find the subnet." }
    ]
};

// ============================================================
// CIDR Data for reference table
// ============================================================
const cidrData = [];
for (let i = 0; i <= 32; i++) {
    const netmaskBits = i;
    const hostBits = 32 - i;
    let usableLabel;
    if (hostBits === 0) usableLabel = '1 address (host route)';
    else if (hostBits === 1) usableLabel = '2 addresses (point-to-point, RFC 3021)';
    else usableLabel = (Math.pow(2, hostBits) - 2).toLocaleString();

    let octet = [0, 0, 0, 0];
    for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 8; k++) {
            if (j * 8 + k < netmaskBits) octet[j] += Math.pow(2, 7 - k);
        }
    }
    cidrData.push({
        prefix: '/' + i,
        subnetMask: octet.join('.'),
        wildcard: octet.map(o => 255 - o).join('.'),
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
    return [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
}

function isValidIpv4(ip) {
    if (!ip || typeof ip !== 'string') return false;
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    for (const part of parts) {
        if (!/^\d{1,3}$/.test(part)) return false;
        const num = parseInt(part, 10);
        if (num < 0 || num > 255) return false;
        if (part.length > 1 && part[0] === '0') return false;
    }
    return true;
}

function generateRandomIpv4() {
    const ipClass = Math.random() < 0.5 ? 'private' : 'public';
    if (ipClass === 'private') {
        const type = Math.floor(Math.random() * 3);
        switch (type) {
            case 0: return `10.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
            case 1: return `172.${16 + Math.floor(Math.random() * 16)}.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
            case 2: return `192.168.${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}`;
        }
    } else {
        let first, second, third, fourth;
        do {
            first = Math.floor(Math.random() * 223) + 1;
            second = Math.floor(Math.random() * 256);
            third = Math.floor(Math.random() * 256);
            fourth = Math.floor(Math.random() * 256);
        } while (
            first === 10 || first === 127 ||
            (first === 172 && second >= 16 && second <= 31) ||
            (first === 192 && second === 168) ||
            first === 0
        );
        return `${first}.${second}.${third}.${fourth}`;
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
    return { network, netmask, broadcast, firstUsable, lastUsable, totalHosts, usableHosts, cidrPrefix };
}

// ============================================================
// v2 Question Generation — non-boundary IPs + cross-octet
// ============================================================
function getRequiredCidrPrefix(requiredHosts) {
    const hostBits = Math.ceil(Math.log2(requiredHosts + 2));
    return 32 - hostBits;
}

function generateQuestion(difficulty) {
    let requiredHosts, baseIp;

    switch (difficulty) {
        case 'beginner':
            // /20-/28: cross-octet subnetting in 3rd and 4th octets
            requiredHosts = pickHostCount([14, 20, 30, 50, 60, 100, 120, 200, 300, 500, 800, 1000, 2000, 4000]);
            baseIp = generateRandomIpv4();
            break;
        case 'intermediate':
            // /14-/30: crosses 2nd and 3rd octets, full range
            requiredHosts = pickHostCount([2, 4, 6, 10, 14, 30, 50, 100, 200, 500, 1000, 2000, 4000, 8000, 16000, 30000, 60000]);
            baseIp = generateRandomIpv4();
            break;
        case 'advanced':
            // /8-/30: any prefix including massive networks
            requiredHosts = pickHostCount([2, 4, 6, 10, 30, 100, 500, 2000, 8000, 30000, 65000, 130000, 500000, 1000000, 4000000, 8000000]);
            baseIp = generateRandomIpv4();
            break;
    }

    const cidrPrefix = getRequiredCidrPrefix(requiredHosts);

    // Calculate subnet info using the base IP (which applies the mask to find the real network)
    const subnetInfo = calculateSubnetInfo(baseIp, cidrPrefix);

    // v2 KEY FEATURE: Generate a random IP within the subnet (not the network or broadcast)
    const networkInt = ipToInt(subnetInfo.network);
    const broadcastInt = ipToInt(subnetInfo.broadcast);
    let givenIp;
    if (broadcastInt - networkInt > 2) {
        // Pick a random IP between first usable and last usable
        const offset = Math.floor(Math.random() * (broadcastInt - networkInt - 1)) + 1;
        givenIp = intToIp(networkInt + offset);
    } else {
        // Very small subnet (/30, /31) — give the first usable
        givenIp = subnetInfo.firstUsable;
    }

    return {
        givenIp,
        mainAddressBlock: `${givenIp}/${cidrPrefix}`,
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

function pickHostCount(options) {
    const base = options[Math.floor(Math.random() * options.length)];
    const cidr = getRequiredCidrPrefix(base);
    const maxForCidr = Math.pow(2, 32 - cidr) - 2;
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

function showValidationError(message) {
    if (validationMsgEl) {
        validationMsgEl.textContent = message;
        validationMsgEl.style.display = 'block';
    }
}

function hideValidationError() {
    if (validationMsgEl) {
        validationMsgEl.style.display = 'none';
        validationMsgEl.textContent = '';
    }
}

function resetInputs() {
    firstUsableInput.value = '';
    lastUsableInput.value = '';
    networkIpInput.value = '';
    broadcastIpInput.value = '';
    [firstUsableInput, lastUsableInput, networkIpInput, broadcastIpInput].forEach(input => {
        input.style.borderColor = '#0f3460';
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

function generateSubnetExamples(cidrPrefix) {
    const prefix = parseInt(cidrPrefix.substring(1));
    if (prefix === 0) return "0.0.0.0/0 (default route / entire Internet)";
    if (prefix === 32) return "/32 (single host route)";
    if (prefix === 31) return "/31 (point-to-point link, RFC 3021)";

    let subnets = [];
    if (prefix === 8) {
        subnets.push("10.0.0.0/8 (Private — RFC 1918)");
        subnets.push("44.0.0.0/8 (AMPRNet)");
        return subnets.join("<br>");
    }
    if (prefix === 16) {
        subnets.push("172.16.0.0/16 (Private — RFC 1918)");
        subnets.push("192.168.0.0/16 (Private — RFC 1918)");
        return subnets.join("<br>");
    }
    if (prefix === 24) {
        subnets.push("192.168.1.0/24 (Common LAN)");
        subnets.push("10.0.0.0/24, 10.0.1.0/24, ...");
        return subnets.join("<br>");
    }
    if (prefix > 24 && prefix <= 30) {
        const blockSize = Math.pow(2, 32 - prefix);
        const subnetCount = Math.pow(2, prefix - 24);
        subnets.push(`<strong>${subnetCount} subnets per /24 (block size: ${blockSize})</strong>`);
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            subnets.push(`192.168.1.${i * blockSize}/${prefix}`);
        }
        if (subnetCount > 4) subnets.push(`... (${subnetCount - 4} more)`);
        return subnets.join("<br>");
    }
    if (prefix > 16 && prefix < 24) {
        const subnetCount = Math.pow(2, prefix - 16);
        const blockSize = Math.pow(2, 24 - prefix);
        subnets.push(`<strong>${subnetCount} subnets per /16 (block size in 3rd octet: ${blockSize})</strong>`);
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            subnets.push(`172.16.${i * blockSize}.0/${prefix}`);
        }
        if (subnetCount > 4) subnets.push(`... (${subnetCount - 4} more)`);
        return subnets.join("<br>");
    }
    if (prefix > 8 && prefix <= 16) {
        const subnetCount = Math.pow(2, prefix - 8);
        const blockSize = Math.pow(2, 16 - prefix);
        subnets.push(`<strong>${subnetCount} subnets per /8 (block size in 2nd octet: ${blockSize})</strong>`);
        for (let i = 0; i < Math.min(4, subnetCount); i++) {
            subnets.push(`10.${i * blockSize}.0.0/${prefix}`);
        }
        if (subnetCount > 4) subnets.push(`... (${subnetCount - 4} more)`);
        return subnets.join("<br>");
    }
    if (prefix < 8) {
        const subnetCount = Math.pow(2, prefix);
        const increment = Math.pow(2, 8 - prefix);
        subnets.push(`<strong>${subnetCount} possible subnets:</strong>`);
        for (let i = 0; i < Math.min(3, subnetCount); i++) {
            subnets.push(`${i * increment}.0.0.0/${prefix}`);
        }
        if (subnetCount > 3) subnets.push(`... (${subnetCount - 3} more)`);
        return subnets.join("<br>");
    }
    return "";
}

function visualizeAddressBlock(givenIp, cidrPrefix) {
    if (!addressVisualizationEl) return;
    const networkBits = cidrPrefix;
    const hostBits = 32 - networkBits;
    const usableHosts = Math.pow(2, hostBits) - 2;

    const ipParts = givenIp.split('.');
    const binaryParts = ipParts.map(part => parseInt(part).toString(2).padStart(8, '0'));
    const binaryString = binaryParts.join('');
    const formattedBinary = [
        binaryString.slice(0, 8), binaryString.slice(8, 16),
        binaryString.slice(16, 24), binaryString.slice(24, 32)
    ].join('.');

    let formattedDisplay = '';
    for (let i = 0; i < formattedBinary.length; i++) {
        const char = formattedBinary[i];
        const currentBitIndex = i - Math.floor(i / 9);
        if (char === '.') formattedDisplay += '.';
        else if (currentBitIndex < networkBits) formattedDisplay += `<span style="color: #e94560; font-weight: bold;">${char}</span>`;
        else formattedDisplay += `<span style="color: #51cf66;">${char}</span>`;
    }

    // Identify the "interesting" octet for cross-octet help
    let interestingOctet = Math.floor(cidrPrefix / 8);
    if (cidrPrefix % 8 === 0 && interestingOctet > 0) interestingOctet--;
    const octetLabels = ['1st', '2nd', '3rd', '4th'];
    const crossOctetNote = (cidrPrefix % 8 !== 0 && cidrPrefix < 32)
        ? `Boundary splits the <strong>${octetLabels[interestingOctet]} octet</strong>`
        : `Boundary on octet edge`;

    addressVisualizationEl.innerHTML = `
        <div>${formattedDisplay}</div>
        <div style="font-size: 12px; margin-top: 8px;">
            <span style="color: #e94560; font-weight: bold;">Network Bits (${networkBits})</span> |
            <span style="color: #51cf66;">Host Bits (${hostBits})</span>
        </div>
        <div style="font-size: 12px; margin-top: 4px;">
            ${crossOctetNote} &bull; Usable Hosts: ${usableHosts > 0 ? usableHosts.toLocaleString() : '0'}
        </div>
    `;
}

// ============================================================
// Game Logic
// ============================================================
function startGame(difficulty) {
    gameState.currentDifficulty = difficulty;
    gameState.currentQuestion = 0;
    gameState.allocatedSubnets = [];
    gameState.gameActive = true;
    gameState.awaitingNext = false;

    hideValidationError();
    startMessageEl.style.display = 'none';
    if (feedbackDetailEl) feedbackDetailEl.style.display = 'none';
    if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';
    if (ipNoteEl) ipNoteEl.style.display = 'block';
    resetInputs();
    updateProgressBar();

    flagContainerEl.classList.remove('active');
    if (flagDisplayEl) flagDisplayEl.textContent = '';

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

    gameState.requiredHosts = question.requiredHosts;
    gameState.correctNetworkIp = question.networkIp;
    gameState.correctSubnetMask = question.subnetMask;
    gameState.correctBroadcastIp = question.broadcastIp;
    gameState.correctFirstUsable = question.firstUsable;
    gameState.correctLastUsable = question.lastUsable;
    gameState.correctCidrPrefix = question.cidrPrefix;
    gameState.givenIp = question.givenIp;

    // Update UI — show the GIVEN IP (not the network address)
    mainAddressEl.textContent = question.mainAddressBlock;
    requiredHostsEl.textContent = question.requiredHosts.toLocaleString();
    subnetMaskEl.textContent = question.subnetMask;

    // Show scenario
    if (scenarioEl) {
        const scenarioList = scenarios[gameState.currentDifficulty];
        const scenario = scenarioList[gameState.currentQuestion % scenarioList.length];
        scenarioEl.innerHTML = `<strong>${scenario.title}:</strong> ${scenario.text
            .replace('{hosts}', question.requiredHosts.toLocaleString())
            .replace('{block}', question.mainAddressBlock)}`;
    }

    updateHint(question);
    visualizeAddressBlock(question.givenIp, question.cidrPrefix);

    // Generic placeholders
    networkIpInput.placeholder = 'e.g., 172.16.40.0';
    firstUsableInput.placeholder = 'e.g., 172.16.40.1';
    lastUsableInput.placeholder = 'e.g., 172.16.47.254';
    broadcastIpInput.placeholder = 'e.g., 172.16.47.255';

    resetInputs();
    hideValidationError();
    gameState.hintLevel = 0;

    gameState.currentQuestion++;
    updateProgressBar();
}

// ============================================================
// v2 Hint System — emphasizes cross-octet subnetting technique
// ============================================================
function updateHint(question) {
    if (!subnetHintEl) return;

    const cidrPrefix = question.cidrPrefix;
    const hostBits = 32 - cidrPrefix;
    const blockSize = Math.pow(2, hostBits);
    const usableHosts = question.usableHosts;

    // Determine the "interesting" octet
    let interestingOctetIndex;
    if (cidrPrefix <= 8) interestingOctetIndex = 0;
    else if (cidrPrefix <= 16) interestingOctetIndex = 1;
    else if (cidrPrefix <= 24) interestingOctetIndex = 2;
    else interestingOctetIndex = 3;

    const bitsInOctet = cidrPrefix - (interestingOctetIndex * 8);
    const octetBlockSize = Math.pow(2, 8 - bitsInOctet);
    const givenOctets = question.givenIp.split('.').map(Number);
    const givenOctetValue = givenOctets[interestingOctetIndex];
    const networkOctetValue = Math.floor(givenOctetValue / octetBlockSize) * octetBlockSize;

    hintContentEl.classList.remove('active');
    gameState.hintLevel = 0;
    startHintCountdown();

    const hintLevels = [];

    // LEVEL 1: Conceptual guidance for cross-octet subnetting
    let h1 = `<strong>Hint Level 1 — How to Approach This</strong><br><br>`;
    h1 += `<strong>Key insight:</strong> The given IP <code>${question.givenIp}</code> is somewhere <em>inside</em> the subnet. You must find where the subnet starts.<br><br>`;
    h1 += `<strong>Step 1:</strong> The prefix is /${cidrPrefix}, which means ${cidrPrefix} network bits and ${hostBits} host bits.<br>`;
    h1 += `<strong>Step 2:</strong> Find the "interesting" octet — the one where the prefix boundary falls. `;
    if (cidrPrefix % 8 === 0) {
        h1 += `For /${cidrPrefix}, the boundary falls exactly on an octet edge, so this is straightforward.<br>`;
    } else {
        h1 += `For /${cidrPrefix}, that's <strong>octet ${interestingOctetIndex + 1}</strong> (${bitsInOctet} network bits used in that octet).<br>`;
    }
    h1 += `<strong>Step 3:</strong> Calculate the block size in that octet: 2<sup>(8 - ${bitsInOctet})</sup> = <strong>${octetBlockSize}</strong>.<br>`;
    h1 += `<strong>Step 4:</strong> Round down the octet value to the nearest multiple of the block size to find the network address. Then compute broadcast, first/last usable.<br><br>`;
    h1 += `<em>Try working it out from here before requesting more help!</em>`;
    hintLevels.push(h1);

    // LEVEL 2: Worked steps
    let h2 = `<strong>Hint Level 2 — Worked Steps</strong><br><br>`;
    h2 += `<strong>Given:</strong> ${question.givenIp}/${cidrPrefix}<br><br>`;
    h2 += `<strong>Step 1:</strong> /${cidrPrefix} = ${cidrPrefix} network bits, ${hostBits} host bits.<br>`;
    h2 += `<strong>Step 2:</strong> The boundary falls in octet ${interestingOctetIndex + 1}. ${bitsInOctet} bits of that octet are for the network.<br>`;
    h2 += `<strong>Step 3:</strong> Block size in octet ${interestingOctetIndex + 1} = 2<sup>${8 - bitsInOctet}</sup> = ${octetBlockSize}.<br>`;
    h2 += `<strong>Step 4:</strong> Octet ${interestingOctetIndex + 1} value is ${givenOctetValue}. `;
    h2 += `Nearest multiple of ${octetBlockSize} &le; ${givenOctetValue} is <strong>${networkOctetValue}</strong>`;
    h2 += ` (${networkOctetValue} &divide; ${octetBlockSize} = ${networkOctetValue / octetBlockSize}).<br>`;
    h2 += `<strong>Step 5:</strong> Set all octets after the interesting one to 0 for the network address, and to 255 for the broadcast.<br>`;
    h2 += `<strong>Step 6:</strong> Broadcast octet ${interestingOctetIndex + 1} = ${networkOctetValue} + ${octetBlockSize} - 1 = ${networkOctetValue + octetBlockSize - 1}.<br><br>`;
    h2 += `<strong>Block size (total addresses):</strong> 2<sup>${hostBits}</sup> = ${blockSize.toLocaleString()}<br>`;
    h2 += `<strong>Usable hosts:</strong> ${blockSize.toLocaleString()} - 2 = ${usableHosts.toLocaleString()}<br><br>`;
    h2 += `<em>Can you fill in the addresses now? Click again for the full answer.</em>`;
    hintLevels.push(h2);

    // LEVEL 3: Full answer
    let h3 = `<strong>Hint Level 3 — Full Answer</strong><br><br>`;
    h3 += `<table class="subnet-table">
        <tr><th>Field</th><th>Value</th><th>How to Calculate</th></tr>
        <tr><td>Network IP</td><td><strong>${question.networkIp}</strong></td><td>Round down octet ${interestingOctetIndex + 1} to multiple of ${octetBlockSize}; zero out lower octets</td></tr>
        <tr><td>First Usable</td><td><strong>${question.firstUsable}</strong></td><td>Network IP + 1</td></tr>
        <tr><td>Last Usable</td><td><strong>${question.lastUsable}</strong></td><td>Broadcast IP - 1</td></tr>
        <tr><td>Broadcast</td><td><strong>${question.broadcastIp}</strong></td><td>Network octet ${interestingOctetIndex + 1} + ${octetBlockSize - 1}; set lower octets to 255</td></tr>
    </table><br>`;
    h3 += `<strong>Explanation:</strong> The given IP ${question.givenIp} with /${cidrPrefix} falls in the block starting at ${question.networkIp}. `;
    h3 += `The block size is ${blockSize.toLocaleString()} (2<sup>${hostBits}</sup>), so the broadcast is ${question.broadcastIp}. `;
    h3 += `Usable range: ${question.firstUsable} through ${question.lastUsable} (${usableHosts.toLocaleString()} hosts).`;
    hintLevels.push(h3);

    subnetHintEl._hintLevels = hintLevels;
    subnetHintEl.innerHTML = hintLevels[0];
}

// ============================================================
// Answer Checking
// ============================================================
function checkAnswers() {
    if (gameState.awaitingNext) return;

    const firstUsable = firstUsableInput.value.trim();
    const lastUsable = lastUsableInput.value.trim();
    const networkIp = networkIpInput.value.trim();
    const broadcastIp = broadcastIpInput.value.trim();

    if (!firstUsable || !lastUsable) {
        showValidationError('Please fill in at least the First Usable and Last Usable IP addresses.');
        return;
    }

    const fieldsToValidate = [
        { value: firstUsable, name: 'First Usable IP', el: firstUsableInput },
        { value: lastUsable, name: 'Last Usable IP', el: lastUsableInput }
    ];
    if (networkIp) fieldsToValidate.push({ value: networkIp, name: 'Network IP', el: networkIpInput });
    if (broadcastIp) fieldsToValidate.push({ value: broadcastIp, name: 'Broadcast IP', el: broadcastIpInput });

    for (const field of fieldsToValidate) {
        if (!isValidIpv4(field.value)) {
            showValidationError(`Invalid IP format for ${field.name}: "${field.value}". Use format like 172.16.40.0`);
            field.el.style.borderColor = '#ff6b6b';
            return;
        }
    }

    let feedbackMessages = [];
    let correctCount = 0;
    let totalChecked = 2;
    const hostBits = 32 - gameState.correctCidrPrefix;
    const blockSize = Math.pow(2, hostBits);

    // Determine interesting octet for hints
    let interestingOctetIndex;
    if (gameState.correctCidrPrefix <= 8) interestingOctetIndex = 0;
    else if (gameState.correctCidrPrefix <= 16) interestingOctetIndex = 1;
    else if (gameState.correctCidrPrefix <= 24) interestingOctetIndex = 2;
    else interestingOctetIndex = 3;

    const bitsInOctet = gameState.correctCidrPrefix - (interestingOctetIndex * 8);
    const octetBlockSize = Math.pow(2, 8 - bitsInOctet);

    if (firstUsable === gameState.correctFirstUsable) {
        correctCount++;
        firstUsableInput.style.borderColor = '#51cf66';
        firstUsableInput.style.backgroundColor = '#0a3d0a';
    } else {
        firstUsableInput.style.borderColor = '#ff6b6b';
        firstUsableInput.style.backgroundColor = '#3d0000';
        feedbackMessages.push({
            field: 'First Usable IP',
            yours: firstUsable,
            hint: `First usable = Network IP + 1. The network IP is found by rounding down octet ${interestingOctetIndex + 1} to the nearest multiple of ${octetBlockSize}, then zeroing out all lower octets.`
        });
    }

    if (lastUsable === gameState.correctLastUsable) {
        correctCount++;
        lastUsableInput.style.borderColor = '#51cf66';
        lastUsableInput.style.backgroundColor = '#0a3d0a';
    } else {
        lastUsableInput.style.borderColor = '#ff6b6b';
        lastUsableInput.style.backgroundColor = '#3d0000';
        feedbackMessages.push({
            field: 'Last Usable IP',
            yours: lastUsable,
            hint: `Last usable = Broadcast IP - 1. The broadcast is the network address with octet ${interestingOctetIndex + 1} increased by ${octetBlockSize - 1} and all lower octets set to 255.`
        });
    }

    if (networkIp) {
        totalChecked++;
        if (networkIp === gameState.correctNetworkIp) {
            correctCount++;
            networkIpInput.style.borderColor = '#51cf66';
            networkIpInput.style.backgroundColor = '#0a3d0a';
        } else {
            networkIpInput.style.borderColor = '#ff6b6b';
            networkIpInput.style.backgroundColor = '#3d0000';
            feedbackMessages.push({
                field: 'Network IP',
                yours: networkIp,
                hint: `The given IP is ${gameState.givenIp}. Apply the /${gameState.correctCidrPrefix} mask: round down octet ${interestingOctetIndex + 1} to the nearest multiple of ${octetBlockSize}, then set all lower octets to 0.`
            });
        }
    }

    if (broadcastIp) {
        totalChecked++;
        if (broadcastIp === gameState.correctBroadcastIp) {
            correctCount++;
            broadcastIpInput.style.borderColor = '#51cf66';
            broadcastIpInput.style.backgroundColor = '#0a3d0a';
        } else {
            broadcastIpInput.style.borderColor = '#ff6b6b';
            broadcastIpInput.style.backgroundColor = '#3d0000';
            feedbackMessages.push({
                field: 'Broadcast IP',
                yours: broadcastIp,
                hint: `Broadcast = Network IP with host bits all set to 1. For /${gameState.correctCidrPrefix}: octet ${interestingOctetIndex + 1} = network value + ${octetBlockSize - 1}, all lower octets = 255.`
            });
        }
    }

    hideValidationError();

    if (feedbackDetailEl) {
        let html = '';
        if (feedbackMessages.length === 0) {
            if (totalChecked === 4) html += `<div class="feedback-summary feedback-success">Perfect! All ${totalChecked} fields correct.</div>`;
            else html += `<div class="feedback-summary feedback-success">Correct! ${correctCount}/${totalChecked} fields right. Fill in all 4 fields for the full challenge!</div>`;
        } else {
            html += `<div class="feedback-summary feedback-partial">${correctCount}/${totalChecked} correct. Review the hints below and try to work out the right answer.</div>`;
        }

        if (feedbackMessages.length > 0) {
            html += '<div class="feedback-corrections feedback-hints-mode">';
            html += '<strong>Hints for incorrect fields:</strong><br>';
            for (const fb of feedbackMessages) {
                html += `<div class="feedback-row feedback-hint-row">`;
                html += `<span class="feedback-label">${fb.field}:</span> `;
                html += `<span class="feedback-wrong">Your answer: ${fb.yours}</span> &mdash; `;
                html += `<span class="feedback-hint">${fb.hint}</span>`;
                html += `</div>`;
            }
            html += '</div>';
        }

        if (feedbackMessages.length === 0) {
            html += '<div class="feedback-explanation">';
            html += `<strong>Solution breakdown for ${gameState.givenIp}/${gameState.correctCidrPrefix}:</strong><br>`;
            html += `<table class="subnet-table">
                <tr><th>Field</th><th>Value</th></tr>
                <tr><td>Given IP</td><td>${gameState.givenIp}</td></tr>
                <tr><td>Network IP</td><td>${gameState.correctNetworkIp}</td></tr>
                <tr><td>First Usable</td><td>${gameState.correctFirstUsable}</td></tr>
                <tr><td>Last Usable</td><td>${gameState.correctLastUsable}</td></tr>
                <tr><td>Broadcast</td><td>${gameState.correctBroadcastIp}</td></tr>
                <tr><td>Subnet Mask</td><td>${gameState.correctSubnetMask}</td></tr>
                <tr><td>Usable Hosts</td><td>${(Math.pow(2, 32 - gameState.correctCidrPrefix) - 2).toLocaleString()}</td></tr>
            </table>`;
            html += '</div>';
        }

        feedbackDetailEl.innerHTML = html;
        feedbackDetailEl.style.display = 'block';
    }

    gameState.allocatedSubnets.push({
        network: gameState.correctNetworkIp,
        cidrPrefix: gameState.correctCidrPrefix,
        hosts: gameState.requiredHosts
    });

    gameState.awaitingNext = true;
    if (nextQuestionBtn) {
        nextQuestionBtn.style.display = 'inline-block';
        nextQuestionBtn.focus();
    }
}

function endGame() {
    gameState.gameActive = false;
    gameState.awaitingNext = false;
    stopHintCountdown();

    if (feedbackDetailEl) {
        feedbackDetailEl.innerHTML = `<div class="feedback-summary feedback-success" style="font-size:1.1em;">Challenge complete! You've conquered all ${gameState.totalQuestions} v2 questions.</div>`;
        feedbackDetailEl.style.display = 'block';
    }

    mainAddressEl.textContent = 'N/A';
    requiredHostsEl.textContent = 'N/A';
    subnetMaskEl.textContent = 'N/A';
    if (scenarioEl) scenarioEl.innerHTML = '';
    if (ipNoteEl) ipNoteEl.style.display = 'none';
    resetInputs();
    startMessageEl.style.display = 'block';
    if (nextQuestionBtn) nextQuestionBtn.style.display = 'none';

    progressBar.style.width = '100%';
    progressText.textContent = 'Round Complete!';
    difficultyBtns.forEach(btn => btn.classList.remove('active'));

    if (gameState.currentQuestion >= gameState.totalQuestions) {
        decryptFlag(gameState.currentDifficulty).then(flag => {
            if (flag && flagDisplayEl) flagDisplayEl.textContent = flag;
            else if (flagDisplayEl) flagDisplayEl.textContent = 'Flag decryption failed. Contact your instructor.';
            flagContainerEl.classList.add('active');
        });
    }
}

// ============================================================
// Event Listeners
// ============================================================
difficultyBtns.forEach(btn => {
    btn.addEventListener('click', () => startGame(btn.id));
});

allocateBtn.addEventListener('click', () => {
    if (gameState.awaitingNext) { nextQuestion(); return; }
    if (gameState.gameActive) checkAnswers();
    else showValidationError('Please select a difficulty level to start the game.');
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && gameState.gameActive) {
        e.preventDefault();
        if (gameState.awaitingNext) nextQuestion();
        else checkAnswers();
    }
});

if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', () => nextQuestion());
}

showCidrBtn.addEventListener('click', () => {
    cidrModal.style.display = 'block';
    if (cidrTableBody.children.length === 0) populateCidrTable();
});

closeModalBtn.addEventListener('click', () => { cidrModal.style.display = 'none'; });
showHelpBtn.addEventListener('click', () => { helpModal.style.display = 'block'; });
closeHelpBtn.addEventListener('click', () => { helpModal.style.display = 'none'; });

showHintBtn.addEventListener('click', () => {
    const levels = subnetHintEl._hintLevels;
    if (!levels) return;
    if (gameState.hintLevel === 2 && hintContentEl.classList.contains('active')) {
        hintContentEl.classList.remove('active');
        showHintBtn.textContent = 'Show Hints';
        showHintBtn.disabled = false;
        showHintBtn.classList.remove('hint-locked');
        return;
    }
    if (gameState.hintLevel === 2 && !hintContentEl.classList.contains('active')) {
        hintContentEl.classList.add('active');
        showHintBtn.textContent = 'Hide Hints';
        return;
    }
    if (getSecondsUntilNextHint() > 0) return;
    if (!hintContentEl.classList.contains('active')) {
        hintContentEl.classList.add('active');
        subnetHintEl.innerHTML = levels[0];
        updateHintButtonState();
    } else if (gameState.hintLevel === 0) {
        gameState.hintLevel = 1;
        subnetHintEl.innerHTML += '<hr class="hint-divider">' + levels[1];
        updateHintButtonState();
    } else if (gameState.hintLevel === 1) {
        gameState.hintLevel = 2;
        subnetHintEl.innerHTML += '<hr class="hint-divider">' + levels[2];
        showHintBtn.textContent = 'Hide Hints';
        showHintBtn.disabled = false;
        showHintBtn.classList.remove('hint-locked');
        stopHintCountdown();
    }
});

window.addEventListener('click', (event) => {
    if (event.target === cidrModal) cidrModal.style.display = 'none';
    if (event.target === helpModal) helpModal.style.display = 'none';
});
