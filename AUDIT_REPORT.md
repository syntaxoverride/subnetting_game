# Subnetting Game - Audit Report

**Date:** 2026-02-10
**Scope:** Full review of `index.html`, `script.js`, `styles.css`, and `README.md`
**Target Audience Assumption:** Entry-level network students with no subnetting experience

---

## Executive Summary

The game has a solid UI foundation and good educational intent, but contains **several critical bugs that will crash the game at runtime**, a **fundamental design flaw in how questions are generated and validated**, and **multiple pedagogical issues** that would confuse entry-level students rather than teach them. The issues below are ordered by severity.

---

## CRITICAL - Game-Breaking Bugs

### BUG-01: `generateRandomIpv4()` references undeclared variable — crashes game

**File:** `script.js:111-118`
**Severity:** Critical (runtime crash)

```javascript
// Line 111-118
let first = Math.floor(Math.random() * 223) + 1;
while ((first === 10) || (first === 172 && (second >= 16 && second <= 31)) || (first === 192 && second === 168)) {
    first = Math.floor(Math.random() * 223) + 1;
}
const second = Math.floor(Math.random() * 256);  // declared AFTER use on line 113
const third = Math.floor(Math.random() * 256);
return `${first}.${second}.${third}.0`;
```

The variable `second` is referenced on line 113 inside the `while` condition, but it is not declared until line 116. JavaScript's `const` has a temporal dead zone — accessing it before declaration throws `ReferenceError: Cannot access 'second' before initialization`.

**Impact:** Intermediate and Advanced modes generate random IPs. When the public IP branch is selected (~30% of calls), this crash occurs. The game silently breaks with no feedback to the student.

---

### BUG-02: Answer validation does not check against the correct answer

**File:** `script.js:576-659`
**Severity:** Critical (core game logic broken)

The `checkAnswers()` function **never compares user input against the stored correct answers** (`gameState.correctFirstUsable`, `gameState.correctNetworkIp`, etc.). Instead, it:

1. Takes the user's first usable IP input
2. Subtracts 1 to derive a network address
3. Applies the `requiredCidrPrefix` (based on required hosts, NOT the displayed CIDR)
4. Recalculates what the subnet "should be" from that derived network
5. Compares the user's input against this recalculated result

```javascript
// Line 594 — derives "correct" answer from user's own input
const possibleNetworkIpInt = ipToInt(firstUsable) - 1;
const possibleNetworkIp = intToIp(possibleNetworkIpInt);
const userSubnetInfo = calculateSubnetInfo(possibleNetworkIp, requiredCidrPrefix);
```

**Problems:**
- The validation uses `requiredCidrPrefix` (derived from the required hosts count), but the question displays a different CIDR prefix and subnet mask. The "correct" answers in the hint and placeholders are calculated from the displayed CIDR, not the required hosts CIDR.
- The `gameState.correctFirstUsable`, `gameState.correctLastUsable`, etc. are stored but **never read** during validation.
- The system derives expected answers from user input rather than comparing against a known-correct answer.

---

### BUG-03: Question generation creates impossible/contradictory questions

**File:** `script.js:147-183`
**Severity:** Critical (pedagogical)

`generateQuestion()` picks `cidrPrefix` and `requiredHosts` **independently at random**. The CIDR prefix determines the network shown to the student, while `requiredHosts` is displayed separately. These two values are unrelated.

**Examples of impossible questions generated:**

| Difficulty | CIDR | Usable Hosts in Subnet | Required Hosts | Result |
|---|---|---|---|---|
| Beginner | /30 | 2 | 54 | Impossible — subnet has 2 hosts, needs 54 |
| Beginner | /29 | 6 | 50 | Impossible — subnet has 6 hosts, needs 50 |
| Beginner | /24 | 254 | 5 | Valid but confusing — subnet is much larger than needed |
| Intermediate | /27 | 30 | 549 | Impossible |
| Advanced | /31 | 0* | 5000 | Impossible and nonsensical |

The hint system partially acknowledges this by showing a "Warning: The main address block can only fit X hosts," but this is deeply confusing for entry-level students who are told the question is solvable.

---

## HIGH - Logic Errors

### BUG-04: Scoring bug — skipping optional fields awards more points than attempting them

**File:** `script.js:600-644`
**Severity:** High

When `feedbackMessages` is empty (all answered fields are correct), the code unconditionally awards 6 points:

```javascript
if (feedbackMessages.length === 0) {
    displayStatus('Perfect! All answers are correct.', 'green');
    updateScore(6);  // Always 6, regardless of which fields were filled
}
```

But Network IP and Broadcast IP are optional fields. If a student only fills in First Usable and Last Usable (correctly), `feedbackMessages` is empty (no errors to report), so they receive 6 points — the maximum score. If they had attempted the optional fields and gotten one wrong, they'd receive fewer points.

**Result:** The optimal strategy is to **never fill in the optional fields**, which directly undermines the learning objective.

---

### BUG-05: Placeholders reveal the correct answers

**File:** `script.js:477-480`
**Severity:** High (defeats educational purpose)

```javascript
firstUsableInput.placeholder = `e.g., ${question.firstUsable}`;
lastUsableInput.placeholder = `e.g., ${question.lastUsable}`;
networkIpInput.placeholder = `e.g., ${question.networkIp}`;
broadcastIpInput.placeholder = `e.g., ${question.broadcastIp}`;
```

The placeholder text for every input field contains the actual correct answer for that question. Students can simply read the placeholder and type it in. This completely eliminates the learning challenge.

---

### BUG-06: Hint reveals the complete solution, not a hint

**File:** `script.js:554-558`
**Severity:** High (defeats educational purpose)

```javascript
hint += `• Network address: ${networkAddress}<br>`;
hint += `• First usable: ${question.firstUsable}<br>`;
hint += `• Last usable: ${question.lastUsable}<br>`;
hint += `• Broadcast: ${question.broadcastIp}<br><br>`;
```

The "hint" displays all four answers verbatim. A hint should guide the student through the reasoning process without giving away the answer. Showing the full solution removes the opportunity for the student to practice.

---

### BUG-07: `/31` generates invalid usable host ranges in Advanced mode

**File:** `script.js:122-143, 165`
**Severity:** High

Advanced mode can generate `/31` (line 165: range is /8 to /31). For a /31 subnet:
- `broadcastInt = networkInt + 1`
- `firstUsable = networkInt + 1` (same as broadcast)
- `lastUsable = broadcastInt - 1 = networkInt` (same as network address)

This produces `firstUsable > lastUsable` — an inverted, invalid range. The student would be asked to enter a "last usable" IP that is numerically lower than the "first usable" IP, which contradicts everything taught about IP ranges.

Additionally, `usableHosts` = 0 for /31, yet the question still asks the student to allocate hosts for a subnet that has none (in traditional subnetting).

---

### BUG-08: `getRequiredCidrPrefix` is computed but unused in `nextQuestion()`

**File:** `script.js:463`
**Severity:** Medium (dead code / design confusion)

```javascript
const requiredCidrPrefix = getRequiredCidrPrefix(question.requiredHosts);
// This variable is never used in nextQuestion()
```

This suggests the developer intended to use `requiredCidrPrefix` to adjust the question or display, but it was never wired up. The displayed subnet mask always reflects the randomly chosen CIDR, not the one needed for the required hosts.

---

## MEDIUM - Pedagogical / Accuracy Issues

### PED-01: CIDR reference table mislabels `192.168.0.0/16` as "Private Class B"

**File:** `script.js:263`

```javascript
subnets.push("192.168.0.0/16 (Private Class B)");
```

192.168.x.x addresses are in the **Class C** range (192.0.0.0 - 223.255.255.255). The private range 192.168.0.0/16 uses a /16 (Class B-sized) prefix, but the addresses themselves are Class C. Labeling this "Private Class B" will teach students incorrect classful addressing.

**Correct label:** `192.168.0.0/16 (Private Range)` — or if classful labels are desired: note that it's a Class C address space with a /16 prefix.

---

### PED-02: CIDR reference `/8` examples include non-standard networks

**File:** `script.js:256-258`

```javascript
subnets.push("10.0.0.0/8 (Private Class A)");   // Correct
subnets.push("172.0.0.0/8");                      // Misleading
subnets.push("192.0.0.0/8");                      // Misleading
```

`172.0.0.0/8` and `192.0.0.0/8` are not commonly used or recognized networks. The private 172.x.x.x range is `172.16.0.0/12`, not /8. Showing these as example /8 networks could confuse students into thinking these are standard allocations.

---

### PED-03: "Boundary" column in hint table is unexplained

**File:** `script.js:521-529`

The hint's subnet reference table includes a "Boundary" column with values (1, 128, 64, 32, 16, 8, 4). This represents the block size / network increment in the fourth octet, but:
- The term "Boundary" is never defined anywhere in the game
- Entry-level students won't know what this means
- No tooltip, footnote, or explanation is provided

---

### PED-04: `/31` and `/32` show "N/A" for usable IPs without explanation

**File:** `script.js:55-56, 77`

For /31 and /32, the CIDR table shows "N/A" for usable IPs. Entry-level students should understand **why** these have no usable hosts (network + broadcast consume all addresses). A bare "N/A" doesn't teach this concept. A label like "0 (point-to-point)" for /31 and "0 (host route)" for /32 would be more instructive.

---

### PED-05: Help modal step order is slightly off

**File:** `index.html:121-129`

The help modal lists steps as:
1. Identify the network address and CIDR prefix
2. Determine required hosts
3. Calculate the appropriate subnet mask
4. Find the network address
5. Find the first usable IP
6. **Find the broadcast address**
7. **Find the last usable IP**

Steps 6 and 7 are in the wrong pedagogical order. Students should learn that the broadcast is the **last** address in the subnet (derived from the network + host bits all set to 1), and the last usable is broadcast - 1. The current ordering implies you should find broadcast before understanding the full range, which is actually correct mathematically but the list doesn't explain the dependency. This is a minor point but worth noting for entry-level instruction.

---

## LOW - Quality / UX Issues

### UX-01: No IP address format validation

**File:** `script.js:576-659`

The `ipToInt()` function silently accepts malformed input like `"abc"`, `"999.999.999.999"`, or `"192.168.1"`. It won't throw an error — it will produce garbage numbers. The `try/catch` in `checkAnswers()` won't catch this because no exception is thrown. Students who make typos get confusing "wrong answer" feedback instead of "invalid format" guidance.

---

### UX-02: No keyboard submit (Enter key)

Students must click the "Allocate" button to submit. Pressing Enter in an input field does nothing. This is a minor friction point, especially for students typing IP addresses quickly.

---

### UX-03: CSS references `.verify-panel` class that doesn't exist in HTML

**File:** `styles.css:116`

```css
.request-panel, .allocate-panel, .verify-panel, .score-panel {
```

The `.verify-panel` class is styled but never used in `index.html`. This is dead CSS — harmless but indicates a removed or renamed feature.

---

### UX-04: The game flag is visible in page source — **RESOLVED**

**Status:** Fixed. Flags are now AES-256-GCM encrypted with PBKDF2 key derivation. Three difficulty-specific flags are stored as encrypted hex blobs in `script.js` and decrypted via the Web Crypto API only upon game completion. No plaintext flags exist in the source.

---

### UX-05: 2-second auto-advance is too fast for learning

**File:** `script.js:655`

```javascript
setTimeout(nextQuestion, 2000);
```

After submitting an answer, the game auto-advances to the next question after 2 seconds. When a student gets an answer wrong, the feedback message (showing correct answers) disappears in 2 seconds — not enough time to read, understand, and learn from the mistake. Entry-level students need more time to absorb corrections.

---

## Summary Table

| ID | Severity | Category | Summary |
|---|---|---|---|
| BUG-01 | **Critical** | Runtime | `second` used before declaration — crashes Intermediate/Advanced |
| BUG-02 | **Critical** | Logic | Answer validation ignores stored correct answers |
| BUG-03 | **Critical** | Logic | CIDR and required hosts are independent — creates impossible questions |
| BUG-04 | **High** | Logic | Skipping optional fields gives maximum score |
| BUG-05 | **High** | Pedagogy | Placeholders contain the correct answers |
| BUG-06 | **High** | Pedagogy | Hint shows complete solution instead of guidance |
| BUG-07 | **High** | Logic | /31 subnets produce inverted usable ranges |
| BUG-08 | **Medium** | Dead Code | `requiredCidrPrefix` computed but unused in `nextQuestion()` |
| PED-01 | **Medium** | Accuracy | 192.168.0.0/16 mislabeled as "Class B" |
| PED-02 | **Medium** | Accuracy | /8 examples include non-standard networks |
| PED-03 | **Medium** | Pedagogy | "Boundary" column unexplained |
| PED-04 | **Medium** | Pedagogy | /31 and /32 show "N/A" without explanation |
| PED-05 | **Low** | Pedagogy | Help modal step ordering |
| UX-01 | **Low** | UX | No IP format validation |
| UX-02 | **Low** | UX | No Enter key support |
| UX-03 | **Low** | Quality | Dead CSS class `.verify-panel` |
| UX-04 | **Low** | Security | Flag visible in HTML source |
| UX-05 | **Low** | UX | 2-second auto-advance too fast for learning |

---

## Recommended Fix Priority

**Phase 1 — Must fix (game is non-functional without these):**
1. Fix `generateRandomIpv4()` variable ordering (BUG-01)
2. Redesign question generation so CIDR prefix and required hosts are consistent (BUG-03)
3. Rewrite `checkAnswers()` to validate against known-correct answers from `gameState` (BUG-02)
4. Remove answers from placeholders (BUG-05)
5. Fix /31 edge case — either exclude /31 from generation or handle it properly (BUG-07)

**Phase 2 — Should fix (game works but teaches incorrectly):**
6. Fix scoring logic for optional fields (BUG-04)
7. Replace full-solution hint with guided steps (BUG-06)
8. Correct "Class B" labeling for 192.168.0.0/16 (PED-01)
9. Fix /8 example networks (PED-02)
10. Add explanation for "Boundary" column or remove it (PED-03)

**Phase 3 — Nice to fix (polish):**
11. Add IP format validation with clear error messages (UX-01)
12. Add Enter key submit handler (UX-02)
13. Increase auto-advance delay or add "Next" button (UX-05)
14. Clean up dead CSS / unused variables (UX-03, BUG-08)
