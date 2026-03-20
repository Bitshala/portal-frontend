import type { WeekContent } from '../types/instructions';

export const bpdWeeks: WeekContent[] = [
  {
    week: 1,
    title: "Bitcoin Protocol Development Cohort",
    content: "## Reading Material\n- [Welcome to the Bitcoin Protocol Development Seminar](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/welcome-to-the-bitcoin-protocol)",
    gdQuestions: [
      "Why did Satoshi put so much stress on the irreversibility of transactions?",
      "What proposed role do SPV nodes play in the Bitcoin ecosystem?",
      "What do you think might happen if Satoshi returned to Bitcoin development?",
      "How have show-stopping bugs or disruptions to the network been handled in the past?",
      "In your opinion, what did Satoshi \"invent\" that was truly new?",
      "What is a Sybil Attack, and how has it been solved in the past before Bitcoin? How does Proof of Work enable Sybil resistance in the Bitcoin network?",
      "Explain the \"fair exchange problem\" in distributed economic systems. How does Bitcoin address it? Provide real-world examples of fair exchange solutions within the Bitcoin ecosystem.",
      "According to the authors of \"Bitcoin's Academic Pedigree,\" what are the reasons for the academic community initially overlooking Bitcoin? In your opinion, has academia embraced Bitcoin research over the years?",
      "In the context of Bitcoin development, how would you judge the merits or value of a good project/experiment?",
      "Why did Bitcoin's creator remain anonymous? Can you recall legal action against cryptographic research before Bitcoin? Why have states historically viewed cryptography with hostility?",
      "What is Block Subsidy? When will the block subsidy go to zero? How will the miners sustain themselves once the Block Subsidy reaches zero?",
      "Define the differences between a full node, a pruned node, and an SPV node?",
      "What are the incentives to run a full node? What role does a full node play in decentralised network security? What would happen if the full node count in the network drastically reduced?",
      "What is a mempool? What is it useful for? Are the mempools of all nodes exactly the same? If not, why not? What would happen if the mempools diverge massively among the nodes?",
      "What are checkpoints in the blockchain? What are they used for?"
    ],
    bonusQuestions: [
      "The white paper, in section 4, mentions that \"Proof-of-work is essentially One-CPU-one-vote\". What are the three functions that this \"CPU\" performs? Reflect on what Satoshi's CPU has evolved into today.",
      "The white paper defines bitcoin as \"a chain of digital signatures\". The inherent assumption is that signatures are unforgeable. Does this assumption hold today?",
      "Suppose global hashpower drops by 50% overnight, what happens to block times before the next adjustment, and what happens after the adjustment?",
      { question: "Explain why the plot (average time taken to produce a bitcoin block in a day) is 'noisy'.", image: "/images/bpd/question4.png" },
      { question: "Assume that you are a merchant accepting Bitcoin. The table below shows the probability of reversing a transaction given the number of confirmations and attacker's hash rate (as a % of network's hash rate). What is the number of confirmations you would be comfortable with?", image: "/images/bpd/question5.png" },
      "Define what must stay on L1 versus what can move to L2 without eroding Bitcoin's key security properties. Where is the bright line, if any?"
    ],
    assignmentLinks: {
      1: "https://classroom.github.com/a/dSwyPQx8",
    }
  },
  {
    week: 2,
    title: "SEGWIT",
    content: "## Reading Material\n- [SEGWIT](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/segwit)",
    gdQuestions: [
      "What is the SegWit upgrade? Why was it called SegWit? Is a non-SegWit node considered a full node?",
      "What is the difference between a hard and soft fork? Which one is preferable for protocol upgrades and why? What is BIP9 Signalling?",
      "Why is Segwit a softfork? How does a non-Segwit node handle verification of a Segwit transaction?",
      "What is the difference between wrapped SegWit and native SegWit addresses? Why are wrapped Segwit addresses needed?",
      "Describe ECDSA Malleability. Give a few concrete examples of how an ECDSA signature can be modified without invalidating it.",
      "Why do second-layer protocols (like Lightning) require transaction malleability to be fixed? How did we fix it?",
      "What is the Quadratic Sighash problem? How does Segwit fix this?",
      "What rationale behind using a 4 MB max block size limit in Segwit Upgrade? What was the limit before? In your opinion, was increasing the limit a good idea?",
      "How does a blockheader commit to Segwit witness data of the transactions? Where do other parts of the transaction data get committed in the blockheader?",
      "What is a Virtual Byte(VB)? What is Weight Unit(WU)? What's the relation between them? How do weights vary between a segwit and a non-segwit transaction of similar inputs and outputs?",
      "Why was the Segwit upgrade controversial? What was BIP148 (UASF)? Why was it deployed? What was the effect of deploying the UASF?",
      "How does SegWit affect the initial block download (IBD)?",
      "What is ASIC Boost? Describe the two variants of it, Covert and Overt ASIC Boost. What was Segwit's effect on ASIC Boost?",
      "Describe the BIP9 Softfork activation process. How do miners signal for activation? Why do we need a super majority of miner signalling before activation?",
      "What are some major requirements and design goals while designing the address format? How was Bech32 improved over previous formats?",
      "What is the Bech32 mutability issue? How is it fixed for Taproot addresses?"
    ],
    bonusQuestions: [
      "At the P2P layer, what changed so that upgraded nodes can relay transactions/blocks with witness while still staying compatible with older peers? Name the key idea and what problem it solves.",
      "SegWit removes third-party txid malleability for SegWit spends, but some fields can still be mutated. Identify what can still change without changing the txid, and explain why that remaining mutability is considered acceptable.",
      { question: "The image shows two transactions in Block #553724 (post SegWit), of which among the two has its txid = wtxid?", image: "/images/bpd/week2/question3.png" },
      { question: "Which among these representations is a hard fork and a soft fork? (new refers to the client with the new set of consensus changes)", image: "/images/bpd/week2/question4.png" },
    ],
    assignmentLinks: {
      1: "https://classroom.github.com/a/IV07G3s9",
    }
  },
  {
    week: 3,
    title: "Mining and Network Block Propagation",
    content: "## Reading Material\n- [Mining and Network Block Propagation](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/mining-network-prop)",
    gdQuestions: [
      "Why would some miners use parts of the version field as a nonce? What other parts of the transaction can miners mutate to increase the nonce space? What effect does this have on the network?",
      "How do P2Pools work? What are their advantages and disadvantages? Name some of the real-life P2Pools in the Bitcoin ecosystem.",
      "What is the maximum allowed deviation for a block's timestamp, and how is it validated? Could variations in timestamps be exploited to compromise the network?",
      "What is the Difficulty Adjustment Algorithm (DAA)? Can Bitcoin work without it? Identify some known DAA exploits used against other low-Proof-of-Work (PoW) blockchains. Explain why Bitcoin is immune to these specific attacks.",
      "What are ASICs? How did Bitcoin mining occur before the advent of ASICs? When and by which company was the first ASIC publicly released? Do you believe ASIC-resistant blockchains (which restrict mining to only GPUs or CPUs) are a good or bad idea, and why?",
      "What are the mempool eviction limits for low-fee transactions? If a wallet's transaction is evicted from the mempool, what action should the wallet take? How would the wallet even become aware of the eviction? What mechanisms are available for increasing transaction fees after an initial broadcast? Provide examples illustrating when one mechanism would be preferred over another.",
      "What are Mempool Policies? How do they differ from Consensus Rules? How do mempool policies affect the behavior of the Bitcoin network as a whole? In Distributed Networks, is it better to have homogeneous or divergent mempool policies? Briefly describe the pros and cons of both. How can you change mempool policies for your node? Name some major policies and their default values for Bitcoin Core nodes.",
      "Describe the major network parameters of the Bitcoin Peer-to-Peer (P2P) network that directly influence the mining process. Briefly describe some significant protocol developments over the last decade that have aimed to improve these specific parameters.",
      "What major factors influence P2P block propagation time? What are the consequences of excessively high block propagation time? Is a 10-minute block interval too slow for Bitcoin? What has been the natural reorg rate on the Bitcoin mainnet in the last six months? What mechanism do miners use to mitigate block propagation latencies, and does its use cause network centralization?",
      "Greg Maxwell mentioned that miners could be hesitant to connect with one another directly, even though it would speed up block propagation. Why? What are the current R&Ds going on to decrease block propagation latency in the Bitcoin Network? Why is this important for decentralisation of the network?",
      "What is StratumV2? What problem does it solve? What are some examples of currently running decentralised mining pools? What is solo mining? What's your current probability of winning block reward via solo mining with a Bitaxe miner? How many miners won the block reward in solo mining in the last 2 years?",
      "What are Compact Block Relays? Why are they useful? How do they differ from Compact Block Filters (BIP157/158)? What is the current number of nodes serving BIP157 Compact Block Filters in the Bitcoin P2P network? What are the 5 most dominant service flags on the current Bitcoin P2P network? How did you find this data?",
      "What are Eclipse Attacks? What would an attacker gain by eclipsing a node? How would an attacker perform this on a target node? What mechanisms do Bitcoin nodes have to resist targeted eclipse attacks? Describe the BGP Hijack attack. Can Bitcoin be attacked via this currently? What are the current R&Ds for mitigating BGP on Bitcoin?"
    ],
    bonusQuestions: [
      "Explain how a compact block is reconstructed from short transaction identifiers. What are the two main reasons reconstruction fails in practice (even for well-connected nodes), and what fallback messages resolve it?",
      "On a scale of sovereignty, how would you order the following types of mining in Bitcoin? P2Pool mining, Pool Mining, Solo Mining?",
      "Whether mining in a pool or solo, it is you who decides which transactions get mined in a block. True or False?",
      "What are shares in pooled mining?",
      "The ASIC, in a miner, constructs the block. True or False?",
      "The ASIC miners are also open source. True or False?",
      "Which block has the largest target in the Bitcoin network?"
    ],
    assignmentLinks: {
      1: "https://classroom.github.com/a/ogEHBuaR",
    }
  },
  {
    week: 4,
    title: "P2P",
    content: "## Reading Material\n- [P2P](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/p2p)",
    gdQuestions: [
      "Describe in brief the different attacks possible in the Bitcoin P2P network. What are some of the latest developments happening on the P2P network? Can you identify other networks pre-Bitcoin that had similar architectures? Can you identify common design primitives of all P2P networks?",
      "What are the benefits of running your own Bitcoin full node? What are the practical ways (hardware and software) to run a full node from a home setup? What are the current typical operating metrics for an operating full node? Specifically, what is the disk usage, I/O throughput, network bandwidth usage (upload/download), and memory usage? What sources did you use to find this data?",
      "Are there private networks operating on Bitcoin that exist separately from the main P2P gossip network? If so, what is the purpose or use case for these private networks? Does the presence of such networks suggest a risk of centralization in the Bitcoin ecosystem? Can a standard, individual node runner connect to these private networks? What potential methods could be employed to address or mitigate the effects of these private networks?",
      "What are Inbound and Outbound connections, and what are the key differences between them? What are the default maximum numbers for Inbound and Outbound connections on a node? Is it possible for a node operator to change these default limits, and if so, what is the procedure? Under what circumstances might a node operator need or want to adjust these default connection settings?",
      "What is a Bitcoin node's Address Book? What specific data is stored within it? Where exactly is the address book file located within the node's data directory? Is the file human-readable? Detail the different tables used in the address book and explain their respective purposes. Are there any potential security vulnerabilities or attacks possible by corrupting a node's address book? What mitigation strategies are currently employed to prevent or address such attacks?",
      "What are Anchor Connections? When were they first introduced? Why are they used? How are these connections chosen? Can you, as a node operator, add your own anchor connections? If so, what is the procedure? In what specific situations might you need to add your own anchor connections?"
    ],
    bonusQuestions: [
      "What is BIP324? What are the privacy/security threats that BIP324 mitigates? Which threats does it not mitigate? What can we do about those?",
      "Bitcoin Core treats addresses differently depending on where they came from (DNS seeds, addr gossip, outbound peers, etc.). Explain why source tagging matters for security, and what attack becomes easier if you don't track it.",
      "How can you bypass the \"standardness rules\" in the P2P network? Are these rules necessary? What attacks could be possible if these rules aren't enforced?",
      "Which of the listed options is a \"policy option\" that a node operator cannot configure?\ndatacarrier\nminrelaytxfee\nmaxwitnesssize\nDustrelayfee",
      "Can a malicious peer send an arbitrarily long P2P message to DOS-attack a node? If not, what limit prevents these attacks?"
    ],
    assignmentLinks: {}
  },
  {
    week: 5,
    title: "Scripts and Wallets",
    content: "## Reading Material\n- [Scripts and Wallets](https://chaincode.gitbook.io/seminars/bitcoin-protocol-development/scripts-wallets)",
    gdQuestions: [
      "Explain the major factors hindering Blockchain scaling. What is a Turing-complete language? Is it a good idea to add Turing-completeness to Bitcoin Scripts? What's the difference between \"computation\" and \"validation\"? What should a global blockchain focus more on architecturally?",
      "What is an Output Descriptor? Why are they useful? Describe the major components of a Descriptor. What libraries are available to work with Descriptors? Can you give a real-world example of a Descriptor wallet? What is the benefit of a Descriptor wallet over traditional wallets?",
      "What is a Miniscript? How is it different from Descriptors? Why is it useful? What libraries are available to work with Miniscripts? Can you identify any real-world wallet that uses Miniscripts? How can end-users find Miniscripts useful?",
      "What is an XPub? Why are they useful? What is the difference between hardened and unhardened derivations? When is one used over the other? What is a Zpub? Is it different from an XPub? Where have you used XPubs in real life?",
      "What is a Mnemonic? How are mnemonics related to XPubs/Xprivs? What is a Master Finger Print? What is it used for? What is the source of the words used for mnemonic generation? How many words are there? Why exactly that many words are needed? What would happen if you deviate from the standard word list and invent your own words?",
      "What is Coin Selection? How many algorithms do we have for Coin Selection in practice? Why is it a hard problem? What libraries can you use to work with coin selection algorithms? How can good Coin Selection improve the privacy of a wallet?",
      "What is UTXO management? Why should UTXOs be managed? Which real-life wallets allow you to manage the UTXO set? As a regular wallet user, do you want your UTXOs to be distributed in many small chunks or consolidated in one large chunk? What is a Dust Attack? What should you do if you get targeted by Dust Attacks?",
      "How can we make Bitcoin transactions more private? What is a Confidential Transaction? Can it be applied to Bitcoin? Will it be a Softfork or Hardfork? What is the rationale for not adding Confidential Transactions to Bitcoin?"
    ],
    bonusQuestions: [
      "Coin selection can expose a wallet by observing how the wallet selects its inputs. Are there any efforts to standardize coin selection into a library so there's a standard?",
      "Describe how Coin Selection patterns can be used to fingerprint wallets. What are possible ways to defend against such attacks? What are other possible ways to fingerprint wallets? How can a wallet developer avoid fingerprinting?",
      "When does a transaction get evicted from the mempool? What recourses do users have to bump up the priority for their transactions? Describe RBF (Replace-By-Fee) and CPFP (Child-Pays-For-Parent) in brief. When should one be used over the other? What real-life wallets allow you to perform RBF or CPFP?",
      "What is a Schnorr signature? How is it different from ECDSA signatures? Why didn't Bitcoin have Schnorr signatures before? Which upgrade added Schnorr signatures to Bitcoin? What are the special benefits of Schnorr signatures?",
      "What is a Nonce in Schnorr signatures? Why does the Nonce have to be random? What happens if it is not random? What is Musig? Why is it useful? Can you specify real-world uses of Musig?",
      "Describe Taproot in brief. What benefits does Taproot provide? Why does Taproot increase transaction privacy? Was Taproot a softfork or a hard fork? How was backward compatibility maintained in the Taproot upgrade?",
      "Why does Tapscript not support OP_CHECKMULTISIG? What does it use instead of OP_CHECKMULTISIG? What is the purpose of Tagged Hashes?"
    ],
    assignmentLinks: {}
  }
];
