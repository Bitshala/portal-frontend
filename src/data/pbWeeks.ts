import type { WeekContent } from '../types/instructions';

export const pbWeeks: WeekContent[] = [
  {
    week: 1,
    title: "Finite Fields & Elliptic Curves",
    content: `
## Reading Material

1. Chapter 1: Finite Fields
2. Chapter 2: Elliptic Curves
    `,
    gdQuestions: [
      "What is a modulo operation? What are the mathematical properties of finite fields? Why are these properties important to have?",
      "Can you explain in simple terms what does order of a finite field means? Why finite fields are constructed with a prime modulo? What happens if its not a prime?",
      "Explain Fermat's little theorem. What is it used for?",
      "How to express negative numbers in finite field? What would be the positive number equivalent of -27mod(5)?",
      "What is an elliptic curve? What was the earliest known elliptic curve? Why elliptic curves are useful in cryptography?",
      "Explain elliptic curve point addition in simple terms.",
      "For elliptic curve point addition the last step is to reflect the resulting point across x-axis. Why is this needed? What happens if there was no reflection?",
      "What is the Point of Infinity? What curve operation produces the point of Infinity? Is it useful in real life crypto implementation?"
    ],
    bonusQuestions: [
      "What is (0,0) + (0,0) ?",
      "What are groups? How do they differ from fields?"
    ]
  },
  {
    week: 2,
    title: "Elliptic Curve Cryptography",
    content: `
## Reading Material

1. Chapter 3: Elliptic Curve Cryptography
    `,
    gdQuestions: [
      "What are elliptic curves over finite fields, and how do they differ from normal elliptic curves? Are there any changes in properties between an Elliptic Curve over Finite Fields and Real Numbers?",
      "What is the Discrete Log Problem, and why is it important in Cryptography? What does it mean when we say \"DLP is hard\"? What would have happened if DLP wasn't a \"hard\" problem?",
      "What is a Mathematical Group, and what properties must a group maintain? What happens if the group operation isn't commutative?",
      "What is secp256k1, and are there other curves similar to it? What makes 256k1 special, and over what finite field is it defined?",
      "What is the generator point, and how is it determined for a specific curve? Is it chosen randomly? Why did Satoshi choose secp256k1 for Bitcoin?",
      "What are Private Keys and Public Keys in the context of elliptic curves? Can you briefly explain the process of generating Private and Public Keys?",
      "What are Public Key additions, and what is the result of adding two public keys? Where can the addition of keys be useful?",
      "What is a Digital Signature, and what is its purpose? What does a Digital Signature ultimately prove? How many different types of Digital Signature algorithms are known, with ECDSA being one of them?",
      "Can you provide a brief description of the Signature Creation and Verification algorithms? Which one takes more time? Bonus: Can you give a real example of the average time taken on your machine for a single ECDSA creation and verification?",
      "Why is it important to have a \"unique K\"? What vulnerabilities can be exploited if K is known to be reused? Can you provide a real-life example of when such an exploit occurred?"
    ],
    bonusQuestions: [
      "Let P1 be a point on the secp256k1 curve with order N over prime P. State Fermat's formula."
    ]
  },
  {
    week: 3,
    title: "Serialization & Transactions",
    content: `
## Reading Material

1. Chapter 4: Serialization
2. Chapter 5: Transactions
    `,
    gdQuestions: [
      "What is the Wallet Import Format (WIF) used for, and how is it generated from a private key?",
      "How is the compressed SEC format serialised for a point P = (x,y)?",
      "Briefly outline the process of creating a Bitcoin address. Which hash operation is used, and what is the purpose of the checksum?",
      "How does Base58 encoding addresses some of the potential issues or limitations of Base64 encoding?",
      "Explain DER signature encoding with an example.",
      "Why does a transaction require a version, and what does it signify with respect to upgradability?",
      "How is the transaction fee determined, and why doesn't it have a dedicated field in the transaction structure?",
      "Explain different types of timelocks which you can have and list the components of the transactions that can be used to set timelocks.",
      "Why don't inputs specify the amount directly? How is the amount determined for each input?",
      "Why was the original idea for using the sequence and locktime fields for \"high-frequency trades\" considered insecure?"
    ],
    bonusQuestions: [
      "What if while creating an address we would do a RIPEMD160 before SHA256?",
      "Why can we encode only input count upto 253 in a single byte in a tx?",
      "Why do the inputs not contain information of the scriptpubkey locking the input?"
    ]
  },
  {
    week: 4,
    title: "Script & Transaction Creation",
    content: `
## Reading Material

1. Chapter 6: Script
2. Chapter 7: Transaction creation
    `,
    gdQuestions: [
      "What are non-standard output scripts? Give an example. Is there a way to use non-standard script on bitcoin network?",
      "What are OP_NOPs? Why do we have them in bitcoin? Why CLTV and CSV opcodes have to be succeeded with OP_DROP opcode? Will other OP_NOPs also have to be followed by OP_DROP?",
      "What should be the state of the stack after a script execution? What is clean stack rule and why is it important? Is it a policy rule or consensus rule?",
      "What are the different components of the transaction? Discuss each of them briefly. Discuss the changes in transaction structure before and after segwit upgrade.",
      "Discuss different Sighash types along with their usecases. Which part of the transaction is hashed in each sighash type?"
    ],
    bonusQuestions: [
      "Why are ScriptSig and ScriptPubKey evaluated separately?",
      "State a flaw in encoding computational challenges in Bitcoin script form.",
      "State any script corresponding to the SHA-1 pinata.",
      "What happens to the UTXO set during a reorg?",
      "What could be a short term solution to the quadratic sighash problem?"
    ]
  },
  {
    week: 5,
    title: "P2SH & Segwit",
    content: `
## Reading Material

1. Chapter 8: P2SH
2. Chapter 13: Segwit
    `,
    gdQuestions: [
      "Why was P2SH proposed, and what were its benefits over bare complex scripts?",
      "How was P2SH activated, and when? Was it a soft fork or a hard fork?",
      "Describe briefly the P2SH script execution mechanism.",
      "Describe briefly the P2SH signature validation mechanism.",
      "Discuss the signature verification process for multisig. Why all multisig transactions have a dummy value (OP_0) at the beginning of the unlocking script? Why would fixing this be a hard fork?",
      "Why does the P2SH script hash 160 bits instead of the regular 256 bits hashes? Can this have any security issues for P2SH scripts?",
      "Why do we encode addresses in base58 instead of base64? Discuss advantages of bech32 over base58 encoding format.",
      "What was the major changes introduced in the Segwit upgrade? Why is it called Segregated Witness?",
      "Define transaction malleability. Explain how SegWit fixes transactional malleability. Why was it important to fix this issue?",
      "What are the two major SegWit address types, and what is the main difference between them?",
      "How was Segwit activated as a soft fork? How would non-segwit nodes process a Segwit transaction?",
      "Highlight the differences between native segwit and nested segwit? Which is better? Why nested segwit was required? Discuss script execution of nested segwit scripts.",
      "What are the differences between P2SH and P2WSH? Which is better in terms of security and why?"
    ],
    bonusQuestions: [
      "Why is it necessary that pre-BIP16 nodes also consider p2sh to be a valid transaction? How is it ensured?"
    ]
  },
  {
    week: 6,
    title: "Blocks & Networking",
    content: `
## Reading Material

1. Chapter 9: Blocks
2. Chapter 10: Networking
    `,
    gdQuestions: [
      "What is a coinbase transaction, and why is it necessary? What are the limitations of data insertion in the coinbase scriptsig? What would happen if a block does not have a coinbase transaction?",
      "What data is included in a Block Header? Describe briefly the uses of each.",
      "Describe briefly the process of Proof Of Work Mining. Is it possible to create fake proof of work? Why is it called \"Proof of Work\"?",
      "What is PoW Target and Difficulty? How is the difficulty value represented in the block header? How are target and difficulty values related?",
      "What is the difficulty adjustment? Why is it required? What would happen if Bitcoin didn't have difficulty adjustment?",
      "Describe the structure of a tx message. What does the fields imply?",
      "Describe the process of network handshake. What information is propagated in the handshake message? Why is this information needed to establish a connection?",
      "Every network message has a different payload structure. You can refer to this link for a comprehensive list. Explain the payload structure in the getheaders message.",
      "Why is the parsed timestamp field from a version message 8 bytes (as opposed to 4 bytes in the block header)?",
      "What are the major network messages a node communicates among them? What is the biggest and the smallest network message?"
    ],
    bonusQuestions: [
      "What are the implications of coinbase transaction being same?",
      "Does mining an empty block mean no bitcoins were mined?",
      "It has been 9 minutes since the last block was mined, when would the next block be mined?",
      "What is the security bottleneck in the difficulty adjustment calculation?",
      "Compare level of network latency tolerable in case of block and transaction propogation."
    ]
  },
  {
    week: 7,
    title: "SPV & Bloom Filters",
    content: `
## Reading Material

1. Chapter 11: SPV
2. Chapter 12: Bloom Filters
    `,
    gdQuestions: [
      "What is an SPV? Why is it useful? Do you know any real-life mobile app that uses SPV inside?",
      "What is a Merkle tree? Describe the process of finding the merkle root from a set of leaves.",
      "What does the Merkle tree data structure achieve in terms of provability? What parts of the Bitcoin protocol it is used?",
      "How is the Merkle tree data included in a block? What does a node use this data for?",
      "Describe briefly what a bloom filter is and why it is useful.",
      "Explain the process by which light clients communicate for bloom filter support with full nodes. What is the difference in gossip messages for such light-client/full-node connections compared to regular P2P gossip?",
      "How do light clients finally find the relevant transactions from bloom filters?",
      "What are the problems associated with using a Bloom Filter for SPV? How are these problems solved in BIP157?",
      "Can you provide practical examples of wallets that use Bloom Filters? Additionally, what are some examples of BIP157 Filters?"
    ],
    bonusQuestions: [
      "What could be an issue with duplicating the last element for calculating the merkle root in case of odd number of items?",
      "Why do we prefer a (merkle) tree structure over just hashing an ordered list?",
      "What is one security risk that SPV face even if they have correct merkle roots?"
    ]
  }
];
