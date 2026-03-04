import type { WeekContent } from '../types/instructions';

export const mbWeeks: WeekContent[] = [
  {
    week: 1,
    title: "Introduction & How Bitcoin Works",
    content: `
## Reading Material

1. [Chapter 1: Introduction](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch01_intro.adoc)
2. [Chapter 2: How Bitcoin Works](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch02_overview.adoc)
    `,
    gdQuestions: [
      "What were the major problems of Digital Currencies before Bitcoin? How did Bitcoin solve them?",
      "Do you think it would be better if bitcoin transactions were reversible? What are the potential benefits and drawbacks?",
      "What is the Bitcoin Issuance Rate? How do we know the supply cap of Bitcoin is 21 million?",
      "Is Bitcoin private? Does Bitcoin need to be private? Why isn't Bitcoin fungible?",
      "What is a transaction fee? How is it calculated? What's the effect of transaction fee on transaction confirmation?",
      "What are change addresses? When are change addresses required? What happens if the user (or wallet software) forgets to include the change address in a transaction? When will we not require a change address?",
      "What does it mean by a transaction to be \"confirmed\"? How many confirmation is usually acceptable? Is it okay to accept unconfirmed transactions? Why or why not?",
      "Why did Satoshi said transactions are \"chain of digital signatures\"? What is a UTXO? Whats the difference between UTXO and Account based model? Why did Bitcoin choose to stick with UTXO model?"
    ],
    bonusQuestions: [
      "Do you believe Bitcoin needs to compete with Visa/MasterCard to succeed? Why or why not?",
      "What are the two main components of a Transaction? What does each component include?",
      "What is the lowest denomination of Bitcoin? Can we run out of decimals to denominate the smallest unit, as Bitcoin adoption increases?"
    ]
  },
  {
    week: 2,
    title: "Bitcoin Core & Keys and Addresses",
    content: `
## Reading Material

1. [Chapter 3: Bitcoin Core: The Reference Implementation](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch03_bitcoin-core.adoc)
2. [Chapter 4: Keys and Addresses](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch04_keys.adoc)
    `,
    gdQuestions: [
      "Why is Bitcoin Core called a \"Reference Implementation\"? What other implementations of Bitcoin are out there? Is it preferable to have many implementations of Bitcoin?",
      "What are BIPs (Bitcoin Improvement Proposals)? What are their role in the Bitcoin development process?",
      "What is bitcoin-cli? What is it used for? Have you explored any bitcoin-cli commands? Which commands do you find most useful as a home node operator?",
      "Describe the functions of 'private keys', 'public keys', 'Bitcoin addresses', and 'digital signatures'. What is the mathematical relationship between them and how are they used in Bitcoin?",
      "What is the discrete logarithm problem, and why is it considered hard to solve?",
      "What is asymmetry in cryptography, and why are one-way functions useful? Identify a one-way cryptographic function used in deriving public keys from private keys.",
      "Describe instances where private keys have been compromised due to lack of entropy. Why is it important to use a cryptographically secure pseudorandom number generator to produce a private key? What are some techniques of generating pseudo random numbers?",
      "What are the different kinds of Bitcoin addresses? Explain the differences between P2PKH and P2SH.",
      "What is the difference between a hot wallet and cold storage?",
      "What is bech32? How is it better than base58? Are there any problems in bech32? How are they solved?"
    ],
    bonusQuestions: [
      "What is the approximate disk space requirement for running Bitcoin Core? What are the approximate network bandwidth and memory requirements? Do you think it's \"cheap\" to run a node?",
      "How can you verify the signatures of download binaries of Bitcoin Core? What are the potential damages of running a malicious version of the software?",
      "What hash functions are used in the generation of Bitcoin addresses?"
    ]
  },
  {
    week: 3,
    title: "Wallet Recovery & Transactions",
    content: `
## Reading Material

1. [Chapter 5: Wallet Recovery](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch05_wallets.adoc)
2. [Chapter 6: Transactions](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch06_transactions.adoc)
    `,
    gdQuestions: [
      "What is a Bitcoin wallet? What are the different types of wallets available?",
      "What is the difference between deterministic and non-deterministic wallets?",
      "What is a \"seed\" in the context of Bitcoin wallets? How are mnemonic words generated from the seed?",
      "What is the optional passphrase for a mnemonic? In which situations passphrase can be useful?",
      "What are the components of an extended key (XPub)? What is the fingerprint of a key?",
      "What are hardened and non-hardened derivations? What are the advantages of having different types of derivations?",
      "What are the different components of a Bitcoin transaction? What are transaction inputs and outputs, and how are they constructed? What are locking and unlocking scripts?",
      "What are various sources of transaction malleability? How does segwit fix transaction malleability? What parts of the transaction structure got affected with the segwit upgrade?"
    ],
    bonusQuestions: [
      "What is nSequence? What was it intended use when Satoshi created Bitcoin? How is it used today?",
      "What are various sources of transaction malleability? How does segwit fix transaction malleability?",
      "Can two transactions have the same transaction id? When can this happen? Is that a consensus violation?"
    ]
  },
  {
    week: 4,
    title: "Authorization and Authentication & Digital Signature",
    content: `
## Reading Material

1. [Chapter 7: Authorization and Authentication](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch07_authorization-authentication.adoc)
2. [Chapter 8: Digital Signatures](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch08_signatures.adoc)
    `,
    gdQuestions: [
      "Is the Turing incompleteness of Bitcoin's scripting language (SCRIPT) a feature or a deficiency?",
      "Explain different types of timelocks available in a Bitcoin transaction and list the components of the transactions that can be used to set these timelocks.",
      "How does Taproot upgrade increase security and privacy in Bitcoin?",
      "Highlight the differences between Tapscript and native Bitcoin script?",
      "What are digital signatures, where are they placed in a transaction, and what is their purpose?",
      "What are sighashes, and what are their uses? How many types of sighashes are there?",
      "What is the Discrete Log Problem, and why is it important in Cryptography? What does it mean when we say \"DLP is hard\"? What would have happened if DLP wasn't a \"hard\" problem?",
      "Why is it important to use a random number (k) as the basis for a private/public nonce pair? What vulnerabilities can be exploited if k is known to be reused? Can you provide a real-life example of when such an exploit occurred?"
    ],
    bonusQuestions: [
      "Why is the public key directly included in a P2TR output whereas in other script types we always include a hash?",
      "Why are the locking and unlocking scripts executed separately?",
      "Besides signing transactions, what other uses could digital signatures have?"
    ]
  },
  {
    week: 5,
    title: "Transaction Fees & The Bitcoin Network",
    content: `
## Reading Material

1. [Chapter 9: Transaction Fees](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch09_fees.adoc)
2. [Chapter 10: The Bitcoin Network](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch10_network.adoc)
    `,
    gdQuestions: [
      "Why do we need to pay transaction fees when we have block reward as an incentive? Is there a minimum fee that every transaction needs to pay? Is it a consensus rule or policy rule?",
      "What is RBF. When is it useful? List all the conditions required to do a valid RBF.",
      "What is CPFP (Child Pays For Parents)? When is it useful? In which situation RBF cannot be used, but CPFP can be used?",
      "What is transaction pinning? How is it a vulnerability for multiparty time-sensitive protocols such as LN?",
      "What is a peer-to-peer network? Give two examples of successful peer-to-peer networks that preceded Bitcoin.",
      "Explain in brief what is a Mempool and what is an Orphan Pool.",
      "How do light clients validate that a transaction exists? How is this different from the mechanism full archival nodes use to validate a transaction?",
      "What are compact block filters? What data should be included in a block filter?"
    ],
    bonusQuestions: [
      "What are the privacy trade-offs in using a light client?",
      "What is fee sniping and how does it work? How can it be prevented?",
      "What is CPFP carve out and anchor outputs?"
    ]
  },
  {
    week: 6,
    title: "The Blockchain & Mining and Consensus",
    content: `
## Reading Material

1. [Chapter 11: The Blockchain](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch11_blockchain.adoc)
2. [Chapter 12: Mining and Consensus](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch12_mining.adoc)
    `,
    gdQuestions: [
      "Describe the structure of a block and what data does a block header contain?",
      "What is a Merkle Tree? How is it used in the blockchain? What data does the Merkle Root verifies?",
      "What is the difference between mainnet and testnet? Can testnet coins have value?",
      "What is the difference between signet and testnet? What is regtest? When is it useful?",
      "What is a coinbase transaction? What prevents the miners from inflating the coinbase reward?",
      "Explain the 51% attack. Can it compromise the security of private keys and signing algorithms?",
      "What is Mining Difficulty? How is it adjusted? What would happen if it wasn't adjusted?",
      "What is the difference between Hard Fork and Soft Fork? Is it possible to do hard fork of Bitcoin, without creating a new coin/network, at current stage of the market?"
    ],
    bonusQuestions: [
      "How are soft forks are activated in Bitcoin? What was the last soft fork that happened?",
      "What is \"Rough Consensus\"? How does it affect Bitcoin's development?",
      "When was the last Bitcoin hardfork? What caused it?"
    ]
  },
  {
    week: 7,
    title: "Bitcoin Security & Second-Layer Applications",
    content: `
## Reading Material

1. [Chapter 13: Bitcoin Security](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch13_security.adoc)
2. [Chapter 14: Second-Layer Applications](https://github.com/bitcoinbook/bitcoinbook/blob/develop/ch14_applications.adoc)
    `,
    gdQuestions: [
      "Why does the author say securing bitcoins is like securing cash or a chunk of precious metal?",
      "What could be the consequences of applying centralised security models to a decentralised network like Bitcoin?",
      "Explain the concept of root of trust in security models. What should be the root of trust for Bitcoin applications?",
      "Why are hardware siging devices the most recommended way of storing Bitcoin?",
      "What are payment channels in context to Bitcoin? How do they facilitate extremely high transaction throughput?",
      "Can a Bitcoin transaction be cancelled? Explain asymmetric revocable transactions.",
      "What is a HTLC? Which OP-code is used to achieve it in context to payment channels?",
      "Explain what are funding and commitment transactions in context of payment channels."
    ],
    bonusQuestions: [
      "What could be the consequences of using unnecessarily complex techniques to secure bitcoins?",
      "Explain at least two use-cases of applications build on top of Bitcoin.",
      "Can a Bitcoin transaction be cancelled? Explain asymmetric revocable transactions."
    ]
  }
];
