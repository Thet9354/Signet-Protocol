// Auto-generated from Foundry artifacts by scripts/sync-abi.mjs — do not edit.
export const aegisEscrowAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "THRESHOLD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approveMilestone",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "signers",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "signatures",
        "type": "bytes[]",
        "internalType": "bytes[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelByMutualConsent",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sigDeadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "funderSignature",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "contributorSignature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "cancelUnfunded",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "computeReleaseDigest",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "reviewNonce",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "commitHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createEscrow",
    "inputs": [
      {
        "name": "contributor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "agentSigner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "disputeWindow",
        "type": "uint40",
        "internalType": "uint40"
      },
      {
        "name": "repoCommitment",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "milestones",
        "type": "tuple[]",
        "internalType": "struct IAegisEscrow.MilestoneInput[]",
        "components": [
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "deadline",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "specHash",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "outputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "eip712Domain",
    "inputs": [],
    "outputs": [
      {
        "name": "fields",
        "type": "bytes1",
        "internalType": "bytes1"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "version",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "chainId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "verifyingContract",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "salt",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "extensions",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "fund",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getEscrow",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IAegisEscrow.Escrow",
        "components": [
          {
            "name": "funder",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "contributor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "agentSigner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "token",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "disputeWindow",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum IAegisEscrow.EscrowState"
          },
          {
            "name": "repoCommitment",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "milestones",
            "type": "tuple[]",
            "internalType": "struct IAegisEscrow.Milestone[]",
            "components": [
              {
                "name": "amount",
                "type": "uint128",
                "internalType": "uint128"
              },
              {
                "name": "deadline",
                "type": "uint40",
                "internalType": "uint40"
              },
              {
                "name": "reviewNonce",
                "type": "uint40",
                "internalType": "uint40"
              },
              {
                "name": "state",
                "type": "uint8",
                "internalType": "enum IAegisEscrow.MilestoneState"
              },
              {
                "name": "specHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "commitHash",
                "type": "bytes32",
                "internalType": "bytes32"
              }
            ]
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getMilestone",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct IAegisEscrow.Milestone",
        "components": [
          {
            "name": "amount",
            "type": "uint128",
            "internalType": "uint128"
          },
          {
            "name": "deadline",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "reviewNonce",
            "type": "uint40",
            "internalType": "uint40"
          },
          {
            "name": "state",
            "type": "uint8",
            "internalType": "enum IAegisEscrow.MilestoneState"
          },
          {
            "name": "specHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "commitHash",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hashCancelAuthorization",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "sigDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hashDisputeResolution",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "hashReleaseAuthorization",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "raiseDispute",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "reclaimExpired",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resolveDispute",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "approved",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "funderSignature",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "contributorSignature",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "submitMilestone",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "commitHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "artifactURI",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "DisputeRaised",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "raisedBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "DisputeResolved",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "approved",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EIP712DomainChanged",
    "inputs": [],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowCancelled",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "refundedAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowCompleted",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowCreated",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "funder",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "contributor",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "agentSigner",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "repoCommitment",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "EscrowFunded",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "token",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "totalAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneApproved",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "commitHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "signers",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneRefunded",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "MilestoneSubmitted",
    "inputs": [
      {
        "name": "escrowId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "milestoneId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "reviewNonce",
        "type": "uint40",
        "indexed": false,
        "internalType": "uint40"
      },
      {
        "name": "commitHash",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      },
      {
        "name": "artifactURI",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BadSignatureCount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "DeadlineNotElapsed",
    "inputs": [
      {
        "name": "reclaimableAt",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "DuplicateSigner",
    "inputs": [
      {
        "name": "signer",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "FundingMismatch",
    "inputs": [
      {
        "name": "expected",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "provided",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidEscrowState",
    "inputs": [
      {
        "name": "actual",
        "type": "uint8",
        "internalType": "enum IAegisEscrow.EscrowState"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidMilestoneState",
    "inputs": [
      {
        "name": "actual",
        "type": "uint8",
        "internalType": "enum IAegisEscrow.MilestoneState"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidShortString",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": [
      {
        "name": "signer",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "InvalidSigner",
    "inputs": [
      {
        "name": "signer",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "MilestoneOutOfRange",
    "inputs": [
      {
        "name": "milestoneId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "NativeTransferFailed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NoMilestones",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ReentrancyGuardReentrantCall",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SafeERC20FailedOperation",
    "inputs": [
      {
        "name": "token",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "SignatureExpired",
    "inputs": [
      {
        "name": "sigDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "SignersNotDistinct",
    "inputs": []
  },
  {
    "type": "error",
    "name": "StringTooLong",
    "inputs": [
      {
        "name": "str",
        "type": "string",
        "internalType": "string"
      }
    ]
  },
  {
    "type": "error",
    "name": "UnauthorizedCaller",
    "inputs": [
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ZeroAddress",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroAmount",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ZeroCommitHash",
    "inputs": []
  }
] as const;

export const aegisEscrowBytecode = "0x610160604052348015610010575f5ffd5b50604080518082018252600b81526a4165676973457363726f7760a81b602080830191909152825180840190935260018352603160f81b9083015290610056825f6100ff565b610120526100658160016100ff565b61014052815160208084019190912060e052815190820120610100524660a0526100f160e05161010051604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201529081019290925260608201524660808201523060a08201525f9060c00160405160208183030381529060405280519060200120905090565b60805250503060c052610321565b5f60208351101561011a5761011383610131565b905061012b565b81610125848261020f565b5060ff90505b92915050565b5f5f829050601f81511115610164578260405163305a27a960e01b815260040161015b91906102c9565b60405180910390fd5b805161016f826102fe565b179392505050565b634e487b7160e01b5f52604160045260245ffd5b600181811c9082168061019f57607f821691505b6020821081036101bd57634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561020a57805f5260205f20601f840160051c810160208510156101e85750805b601f840160051c820191505b81811015610207575f81556001016101f4565b50505b505050565b81516001600160401b0381111561022857610228610177565b61023c81610236845461018b565b846101c3565b6020601f82116001811461026e575f83156102575750848201515b5f19600385901b1c1916600184901b178455610207565b5f84815260208120601f198516915b8281101561029d578785015182556020948501946001909201910161027d565b50848210156102ba57868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b602081525f82518060208401528060208501604085015e5f604082850101526040601f19601f83011684010191505092915050565b805160208083015191908110156101bd575f1960209190910360031b1b16919050565b60805160a05160c05160e051610100516101205161014051613af16103725f395f6129fe01525f6129cd01525f612bdc01525f612bb401525f612b0f01525f612b3901525f612b630152613af15ff3fe608060405260043610610109575f3560e01c8063785ffb37116100a15780639f68609711610071578063ca1d209d11610057578063ca1d209d146102eb578063ecdc5ea7146102fe578063f054f4981461031d575f5ffd5b80639f686097146102ad578063aa0b4158146102cc575f5ffd5b8063785ffb371461021a5780637d19e5961461022e57806384b0196e1461025a5780638ed9895c14610281575f5ffd5b80635014efce116100dc5780635014efce1461019e57806354a4054e146101bd578063579c8dec146101dc5780636298e694146101fb575f5ffd5b8063218517e01461010d5780632ae5de631461013f5780632b73de5a1461016057806341e8a42a1461017f575b5f5ffd5b348015610118575f5ffd5b5061012c6101273660046130a8565b61033c565b6040519081526020015b60405180910390f35b34801561014a575f5ffd5b5061015e610159366004613144565b6103d8565b005b34801561016b575f5ffd5b5061012c61017a3660046131c6565b610901565b34801561018a575f5ffd5b5061015e610199366004613282565b610e0d565b3480156101a9575f5ffd5b5061015e6101b8366004613299565b610f47565b3480156101c8575f5ffd5b5061015e6101d7366004613306565b611203565b3480156101e7575f5ffd5b5061012c6101f6366004613299565b6116ac565b348015610206575f5ffd5b5061015e610215366004613398565b611793565b348015610225575f5ffd5b5061012c600281565b348015610239575f5ffd5b5061024d610248366004613282565b611b73565b60405161013691906134fe565b348015610265575f5ffd5b5061026e611d7a565b60405161013697969594939291906135f4565b34801561028c575f5ffd5b506102a061029b366004613299565b611dd8565b60405161013691906136a6565b3480156102b8575f5ffd5b5061015e6102c7366004613299565b611edc565b3480156102d7575f5ffd5b5061012c6102e6366004613299565b612099565b61015e6102f9366004613282565b6120fe565b348015610309575f5ffd5b5061015e6103183660046136b4565b61231b565b348015610328575f5ffd5b5061012c610337366004613710565b612588565b604080517fe079a77cbe82da85fa06a67c96f2e6d90580a63522a77c6ab337f842cb3b020e6020808301919091528183018990526060820188905264ffffffffff8716608083015260a0820186905260c082018590526001600160a01b03841660e0808401919091528351808403909101815261010090920190925280519101205f906103cd9061263c565b61263c565b979650505050505050565b6103e0612683565b5f86815260036020526040902060026003820154600160c81b900460ff16600481111561040f5761040f613408565b1461045f5760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b60405180910390fd5b5f61046a828861270b565b905060018154600160d01b900460ff16600581111561048b5761048b613408565b146104cf5780546040517f1afee00e00000000000000000000000000000000000000000000000000000000815261045691600160d01b900460ff1690600401613750565b6002851415806104e0575060028314155b15610517576040517f988614d100000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b8585600181811061052a5761052a61375e565b905060200201602081019061053f919061378b565b6001600160a01b031686865f81811061055a5761055a61375e565b905060200201602081019061056f919061378b565b6001600160a01b0316036105e25785855f81811061058f5761058f61375e565b90506020020160208101906105a4919061378b565b6040517fe021c4f20000000000000000000000000000000000000000000000000000000081526001600160a01b039091166004820152602401610456565b805460028201546001840154604080517fe079a77cbe82da85fa06a67c96f2e6d90580a63522a77c6ab337f842cb3b020e6020808301919091528183018e9052606082018d90527501000000000000000000000000000000000000000000860464ffffffffff16608083015260a08201949094526fffffffffffffffffffffffffffffffff90941660c08501526001600160a01b0390911660e08085019190915281518085039091018152610100909301905281519101205f906106a59061263c565b90505f5b6002811015610814575f8888838181106106c5576106c561375e565b90506020020160208101906106da919061378b565b85549091506001600160a01b0380831691161480159061070a575060018501546001600160a01b03828116911614155b8015610726575060028501546001600160a01b03828116911614155b15610768576040517fbf18af430000000000000000000000000000000000000000000000000000000081526001600160a01b0382166004820152602401610456565b6107ca818489898681811061077f5761077f61375e565b905060200281019061079191906137a4565b8080601f0160208091040260200160405190810160405280939291908181526020018383808284375f9201919091525061277692505050565b61080b576040517fd855c4f40000000000000000000000000000000000000000000000000000000081526001600160a01b0382166004820152602401610456565b506001016106a9565b5081547a0200000000000000000000000000000000000000000000000000007fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff821617835560028301546040518a928c927f9c875d7d6c32ddf0ab61f0656e04a73b630d26df4e195026c3793a99b8b27471926108a7926fffffffffffffffffffffffffffffffff16908d908d90613805565b60405180910390a36108b989846127e6565b6003830154600184015483546108ee926001600160a01b039081169216906fffffffffffffffffffffffffffffffff166128e6565b5050506108f961299c565b505050505050565b5f6001600160a01b038816158061091f57506001600160a01b038716155b15610956576040517fd92e233d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b6001600160a01b03881633148061097557506001600160a01b03871633145b806109915750866001600160a01b0316886001600160a01b0316145b156109c8576040517fdc0e68a900000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b815f819003610a03576040517f5c4a81cc00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b60028054905f610a128361389d565b9190505591505f60035f8481526020019081526020015f20905033815f015f6101000a8154816001600160a01b0302191690836001600160a01b0316021790555089816001015f6101000a8154816001600160a01b0302191690836001600160a01b0316021790555088816002015f6101000a8154816001600160a01b0302191690836001600160a01b0316021790555087816003015f6101000a8154816001600160a01b0302191690836001600160a01b03160217905550868160030160146101000a81548164ffffffffff021916908364ffffffffff16021790555060018160030160196101000a81548160ff02191690836004811115610b1757610b17613408565b0217905550600481018690555f5b82811015610dab57858582818110610b3f57610b3f61375e565b610b5592602060609092020190810191506138d4565b6fffffffffffffffffffffffffffffffff165f03610b9f576040517f1f2a200500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b816005016040518060c00160405280888885818110610bc057610bc061375e565b610bd692602060609092020190810191506138d4565b6fffffffffffffffffffffffffffffffff168152602001888885818110610bff57610bff61375e565b9050606002016020016020810190610c179190613903565b64ffffffffff1681525f602082018190526040820152606001888885818110610c4257610c4261375e565b604060609182029390930183013584525f6020948501819052865460018101885596815284902085516003909702018054948601519386015164ffffffffff9081167501000000000000000000000000000000000000000000027fffffffffffff0000000000ffffffffffffffffffffffffffffffffffffffffff91909516700100000000000000000000000000000000027fffffffffffffffffffffff0000000000000000000000000000000000000000009096166fffffffffffffffffffffffffffffffff909816979097179490941795861683178455840151939492939284927fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff167fffffffffff000000000000ffffffffffffffffffffffffffffffffffffffffff909116179050600160d01b836005811115610d8557610d85613408565b02179055506080820151816001015560a082015181600201555050806001019050610b25565b50604080516001600160a01b038b811682528a81166020830152918101889052908b1690339085907fbf12ab44e2c16bf999eabe5d50ebd6db51a142e725137985edf351f16e188e5a9060600160405180910390a45050979650505050505050565b5f81815260036020526040902060016003820154600160c81b900460ff166004811115610e3c57610e3c613408565b14610e835760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b80546001600160a01b03163314610ec8576040517fd86ad9cf000000000000000000000000000000000000000000000000000000008152336004820152602401610456565b6003810180547fffffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffff167904000000000000000000000000000000000000000000000000001790556040515f815282907fdc48a08bb890bd1b8e4261212a97a5e711e80830d96ba56b362f3ac5f427d51e9060200160405180910390a25050565b610f4f612683565b5f82815260036020526040902060026003820154600160c81b900460ff166004811115610f7e57610f7e613408565b14610fc55760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b80546001600160a01b0316331461100a576040517fd86ad9cf000000000000000000000000000000000000000000000000000000008152336004820152602401610456565b5f611015828461270b565b905060028154600160d01b900460ff16600581111561103657611036613408565b148061105e575060058154600160d01b900460ff16600581111561105c5761105c613408565b145b156110a25780546040517f1afee00e00000000000000000000000000000000000000000000000000000000815261045691600160d01b900460ff1690600401613750565b600382015481545f916110ec9164ffffffffff740100000000000000000000000000000000000000009092048216917001000000000000000000000000000000009091041661391c565b905080421161112a576040517fde18619200000000000000000000000000000000000000000000000000000000815260048101829052602401610456565b81547a0500000000000000000000000000000000000000000000000000007fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff82161783556040516fffffffffffffffffffffffffffffffff9091168152849086907f87b8295795cb1bbf640e0809d9371cca438d41ef24e04d885df2e6f49974ac109060200160405180910390a36111c285846127e6565b6003830154835483546111f4926001600160a01b039081169216906fffffffffffffffffffffffffffffffff166128e6565b5050506111ff61299c565b5050565b61120b612683565b5f87815260036020526040902060026003820154600160c81b900460ff16600481111561123a5761123a613408565b146112815760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b5f61128c828961270b565b905060038154600160d01b900460ff1660058111156112ad576112ad613408565b146112f15780546040517f1afee00e00000000000000000000000000000000000000000000000000000000815261045691600160d01b900460ff1690600401613750565b8054604080517f87427ef13771bab95856049053b3bca1337af5b5fccb2948e53d5b088f197f456020808301919091528183018d9052606082018c9052750100000000000000000000000000000000000000000090930464ffffffffff16608082015289151560a0808301919091528251808303909101815260c090910190915280519101205f906113829061263c565b8354604080516020601f8b018190048102820181019092528981529293506113d1926001600160a01b039092169184918b908b90819084018382808284375f9201919091525061277692505050565b6114155782546040517fd855c4f40000000000000000000000000000000000000000000000000000000081526001600160a01b039091166004820152602401610456565b6001830154604080516020601f8801819004810282018101909252868152611463926001600160a01b03169184919089908990819084018382808284375f9201919091525061277692505050565b6114aa5760018301546040517fd855c4f40000000000000000000000000000000000000000000000000000000081526001600160a01b039091166004820152602401610456565b888a7fc84a77110774854ab237145b108e924962dbaa5191275eb044a6cb09621c4a948a6040516114df911515815260200190565b60405180910390a387156116545781547fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff167a0200000000000000000000000000000000000000000000000000001782556040805160028082526060820183525f926020830190803683375050855482519293506001600160a01b0316918391505f9061156e5761156e61375e565b6001600160a01b039283166020918202929092010152600180860154835192169183919081106115a0576115a061375e565b6001600160a01b0390921660209283029190910190910152600283015483546040518c928e927f9c875d7d6c32ddf0ab61f0656e04a73b630d26df4e195026c3793a99b8b274719261160792916fffffffffffffffffffffffffffffffff1690879061392f565b60405180910390a36116198b856127e6565b60038401546001850154845461164e926001600160a01b039081169216906fffffffffffffffffffffffffffffffff166128e6565b50611698565b81547fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff167a0400000000000000000000000000000000000000000000000000001782555b5050506116a361299c565b50505050505050565b5f828152600360205260408120816116c4828561270b565b805460028201546001850154604080517fe079a77cbe82da85fa06a67c96f2e6d90580a63522a77c6ab337f842cb3b020e6020808301919091528183018c9052606082018b90527501000000000000000000000000000000000000000000860464ffffffffff16608083015260a08201949094526fffffffffffffffffffffffffffffffff90941660c08501526001600160a01b0390911660e08085019190915281518085039091018152610100909301905281519101209091506117889061263c565b925050505b92915050565b61179b612683565b844211156117d8576040517fcd21db4f00000000000000000000000000000000000000000000000000000000815260048101869052602401610456565b5f86815260036020526040902060026003820154600160c81b900460ff16600481111561180757611807613408565b1461184e5760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b5f6118ac6103c88989604080517f279859314e36421f30318ec7d85679f8b68ecdd4b56aa1e88ff2a24d3f0b18b860208083019190915281830194909452606080820193909352815180820390930183526080019052805191012090565b8254604080516020601f8a018190048102820181019092528881529293506118fb926001600160a01b039092169184918a908a90819084018382808284375f9201919091525061277692505050565b61193f5781546040517fd855c4f40000000000000000000000000000000000000000000000000000000081526001600160a01b039091166004820152602401610456565b6001820154604080516020601f870181900481028201810190925285815261198d926001600160a01b03169184919088908890819084018382808284375f9201919091525061277692505050565b6119d45760018201546040517fd855c4f40000000000000000000000000000000000000000000000000000000081526001600160a01b039091166004820152602401610456565b60058201545f90815b81811015611ac7575f8560050182815481106119fb576119fb61375e565b5f9182526020909120600390910201905060028154600160d01b900460ff166005811115611a2b57611a2b613408565b14158015611a56575060058154600160d01b900460ff166005811115611a5357611a53613408565b14155b15611abe5780547a0500000000000000000000000000000000000000000000000000007fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff8216178255611abb906fffffffffffffffffffffffffffffffff168561391c565b93505b506001016119dd565b506003840180547fffffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffff167904000000000000000000000000000000000000000000000000001790556040518281528a907fdc48a08bb890bd1b8e4261212a97a5e711e80830d96ba56b362f3ac5f427d51e9060200160405180910390a28115611b675760038401548454611b67916001600160a01b039081169116846128e6565b505050506108f961299c565b611bb960408051610100810182525f8082526020820181905291810182905260608101829052608081018290529060a082019081526020015f8152602001606081525090565b5f8281526003602081815260409283902083516101008101855281546001600160a01b0390811682526001830154811693820193909352600282015483169481019490945291820154908116606084015274010000000000000000000000000000000000000000810464ffffffffff16608084015260a0830190600160c81b900460ff166004811115611c4e57611c4e613408565b6004811115611c5f57611c5f613408565b81526020016004820154815260200160058201805480602002602001604051908101604052809291908181526020015f905b82821015611d6c575f8481526020908190206040805160c0810182526003860290920180546fffffffffffffffffffffffffffffffff8116845264ffffffffff700100000000000000000000000000000000820481169585019590955275010000000000000000000000000000000000000000008104909416918301919091529091606083019060ff600160d01b909104166005811115611d3457611d34613408565b6005811115611d4557611d45613408565b81526020016001820154815260200160028201548152505081526020019060010190611c91565b505050915250909392505050565b5f6060805f5f5f6060611d8b6129c6565b611d936129f7565b604080515f808252602082019092527f0f000000000000000000000000000000000000000000000000000000000000009b939a50919850469750309650945092509050565b611e0e6040805160c0810182525f8082526020820181905291810182905290606082019081526020015f81526020015f81525090565b5f838152600360205260409020611e25818461270b565b6040805160c08101825282546fffffffffffffffffffffffffffffffff8116825264ffffffffff7001000000000000000000000000000000008204811660208401527501000000000000000000000000000000000000000000820416928201929092529190606083019060ff600160d01b909104166005811115611eab57611eab613408565b6005811115611ebc57611ebc613408565b815260018201546020820152600290910154604090910152949350505050565b5f82815260036020526040902060026003820154600160c81b900460ff166004811115611f0b57611f0b613408565b14611f525760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b80546001600160a01b03163314801590611f79575060018101546001600160a01b03163314155b15611fb2576040517fd86ad9cf000000000000000000000000000000000000000000000000000000008152336004820152602401610456565b5f611fbd828461270b565b905060018154600160d01b900460ff166005811115611fde57611fde613408565b146120225780546040517f1afee00e00000000000000000000000000000000000000000000000000000000815261045691600160d01b900460ff1690600401613750565b80547fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff167a0300000000000000000000000000000000000000000000000000001781556040513390849086907f83201991c75b30e493678d0543bdbd02d6a194a5a0dda31490a5fe09e9f0a220905f90a450505050565b5f6120f76103c88484604080517f279859314e36421f30318ec7d85679f8b68ecdd4b56aa1e88ff2a24d3f0b18b860208083019190915281830194909452606080820193909352815180820390930183526080019052805191012090565b9392505050565b612106612683565b5f81815260036020526040902060016003820154600160c81b900460ff16600481111561213557612135613408565b1461217c5760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b80546001600160a01b031633146121c1576040517fd86ad9cf000000000000000000000000000000000000000000000000000000008152336004820152602401610456565b5f6121cb82612a24565b6003830180547902000000000000000000000000000000000000000000000000007fffffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffff8216179091559091506001600160a01b031661226a57803414612265576040517f16db332200000000000000000000000000000000000000000000000000000000815260048101829052346024820152604401610456565b6122c4565b34156122aa576040517f16db33220000000000000000000000000000000000000000000000000000000081525f6004820152346024820152604401610456565b60038201546122c4906001600160a01b0316333084612a87565b6003820154604080516001600160a01b0390921682526020820183905284917f4a2cd88ec7a748d5b20b3512d7249c67745777b219009075c745923684e9653d910160405180910390a2505061231861299c565b50565b5f85815260036020526040902060026003820154600160c81b900460ff16600481111561234a5761234a613408565b146123915760038101546040517f569960f900000000000000000000000000000000000000000000000000000000815261045691600160c81b900460ff1690600401613742565b60018101546001600160a01b031633146123d9576040517fd86ad9cf000000000000000000000000000000000000000000000000000000008152336004820152602401610456565b83612410576040517f799df7a500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b5f61241b828761270b565b90505f8154600160d01b900460ff16600581111561243b5761243b613408565b14158015612466575060048154600160d01b900460ff16600581111561246357612463613408565b14155b156124aa5780546040517f1afee00e00000000000000000000000000000000000000000000000000000000815261045691600160d01b900460ff1690600401613750565b6002810185905580547fffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffffff16600160d01b17808255819060159061250c907501000000000000000000000000000000000000000000900464ffffffffff1661399e565b91906101000a81548164ffffffffff021916908364ffffffffff16021790555085877f0a09dfdf379cc66bc958c6820239268811743f19a8a7ac04ac15b26d0b685866835f0160159054906101000a900464ffffffffff1688888860405161257794939291906139c4565b60405180910390a350505050505050565b5f838152600360205260408120816125a0828661270b565b8054604080517f87427ef13771bab95856049053b3bca1337af5b5fccb2948e53d5b088f197f456020808301919091528183018b9052606082018a9052750100000000000000000000000000000000000000000090930464ffffffffff16608082015287151560a0808301919091528251808303909101815260c090910190915280519101209091506126329061263c565b9695505050505050565b5f61178d612648612b03565b836040517f19010000000000000000000000000000000000000000000000000000000000008152600281019290925260228201526042902090565b7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005c156126dc576040517f3ee5aeb500000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b61270960017f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f005b90612c2c565b565b60058201545f90821061274d576040517fc7f3d14000000000000000000000000000000000000000000000000000000000815260048101839052602401610456565b8260050182815481106127625761276261375e565b905f5260205f209060030201905092915050565b5f836001600160a01b03163b5f036127d4575f5f6127948585612c33565b5090925090505f8160038111156127ad576127ad613408565b1480156127cb5750856001600160a01b0316826001600160a01b0316145b925050506120f7565b6127df848484612c7c565b90506120f7565b60058101545f5b81811015612870575f83600501828154811061280b5761280b61375e565b5f918252602090912060039091020154600160d01b900460ff169050600281600581111561283b5761283b613408565b1415801561285b5750600581600581111561285857612858613408565b14155b15612867575050505050565b506001016127ed565b506003820180547fffffffffffff00ffffffffffffffffffffffffffffffffffffffffffffffffff1679030000000000000000000000000000000000000000000000000017905560405183907f9285bd636dda01bef18996aa38303bb742f6c67a6941646dddb17630cb492c2e905f90a2505050565b6001600160a01b038316612983575f826001600160a01b0316826040515f6040518083038185875af1925050503d805f811461293d576040519150601f19603f3d011682016040523d82523d5f602084013e612942565b606091505b505090508061297d576040517ff4b3b1bc00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b50505050565b6129976001600160a01b0384168383612db7565b505050565b6127095f7f9b779b17422d0df92223018b32b4d1fa46e071723d6817e2486d003becc55f00612703565b60606129f27f00000000000000000000000000000000000000000000000000000000000000005f612de8565b905090565b60606129f27f00000000000000000000000000000000000000000000000000000000000000006001612de8565b60058101545f90815b81811015612a8057836005018181548110612a4a57612a4a61375e565b5f918252602090912060039091020154612a76906fffffffffffffffffffffffffffffffff168461391c565b9250600101612a2d565b5050919050565b6040516001600160a01b03848116602483015283811660448301526064820183905261297d9186918216906323b872dd906084015b604051602081830303815290604052915060e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff8381831617835250505050612e91565b5f306001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016148015612b5b57507f000000000000000000000000000000000000000000000000000000000000000046145b15612b8557507f000000000000000000000000000000000000000000000000000000000000000090565b6129f2604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f60208201527f0000000000000000000000000000000000000000000000000000000000000000918101919091527f000000000000000000000000000000000000000000000000000000000000000060608201524660808201523060a08201525f9060c00160405160208183030381529060405280519060200120905090565b80825d5050565b5f5f5f8351604103612c6a576020840151604085015160608601515f1a612c5c88828585612f16565b955095509550505050612c75565b505081515f91506002905b9250925092565b5f5f5f856001600160a01b03168585604051602401612c9c929190613a25565b604080517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe08184030181529181526020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167f1626ba7e0000000000000000000000000000000000000000000000000000000017905251612d1d9190613a3d565b5f60405180830381855afa9150503d805f8114612d55576040519150601f19603f3d011682016040523d82523d5f602084013e612d5a565b606091505b5091509150818015612d6e57506020815110155b8015612632575080517f1626ba7e0000000000000000000000000000000000000000000000000000000090612dac9083016020908101908401613a53565b149695505050505050565b6040516001600160a01b0383811660248301526044820183905261299791859182169063a9059cbb90606401612abc565b606060ff8314612e0257612dfb83612ffc565b905061178d565b818054612e0e90613a6a565b80601f0160208091040260200160405190810160405280929190818152602001828054612e3a90613a6a565b8015612e855780601f10612e5c57610100808354040283529160200191612e85565b820191905f5260205f20905b815481529060010190602001808311612e6857829003601f168201915b5050505050905061178d565b5f5f60205f8451602086015f885af180612eb0576040513d5f823e3d81fd5b50505f513d91508115612ec7578060011415612ed4565b6001600160a01b0384163b155b1561297d576040517f5274afe70000000000000000000000000000000000000000000000000000000081526001600160a01b0385166004820152602401610456565b5f80807f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0841115612f4f57505f91506003905082612ff2565b604080515f808252602082018084528a905260ff891692820192909252606081018790526080810186905260019060a0016020604051602081039080840390855afa158015612fa0573d5f5f3e3d5ffd5b50506040517fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe001519150506001600160a01b038116612fe957505f925060019150829050612ff2565b92505f91508190505b9450945094915050565b60605f61300883613039565b6040805160208082528183019092529192505f91906020820181803683375050509182525060208101929092525090565b5f60ff8216601f81111561178d576040517fb3512b0c00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b803564ffffffffff8116811461308d575f5ffd5b919050565b80356001600160a01b038116811461308d575f5ffd5b5f5f5f5f5f5f60c087890312156130bd575f5ffd5b86359550602087013594506130d460408801613079565b935060608701359250608087013591506130f060a08801613092565b90509295509295509295565b5f5f83601f84011261310c575f5ffd5b50813567ffffffffffffffff811115613123575f5ffd5b6020830191508360208260051b850101111561313d575f5ffd5b9250929050565b5f5f5f5f5f5f60808789031215613159575f5ffd5b8635955060208701359450604087013567ffffffffffffffff81111561317d575f5ffd5b61318989828a016130fc565b909550935050606087013567ffffffffffffffff8111156131a8575f5ffd5b6131b489828a016130fc565b979a9699509497509295939492505050565b5f5f5f5f5f5f5f60c0888a0312156131dc575f5ffd5b6131e588613092565b96506131f360208901613092565b955061320160408901613092565b945061320f60608901613079565b93506080880135925060a088013567ffffffffffffffff811115613231575f5ffd5b8801601f81018a13613241575f5ffd5b803567ffffffffffffffff811115613257575f5ffd5b8a602060608302840101111561326b575f5ffd5b602082019350809250505092959891949750929550565b5f60208284031215613292575f5ffd5b5035919050565b5f5f604083850312156132aa575f5ffd5b50508035926020909101359150565b8035801515811461308d575f5ffd5b5f5f83601f8401126132d8575f5ffd5b50813567ffffffffffffffff8111156132ef575f5ffd5b60208301915083602082850101111561313d575f5ffd5b5f5f5f5f5f5f5f60a0888a03121561331c575f5ffd5b8735965060208801359550613333604089016132b9565b9450606088013567ffffffffffffffff81111561334e575f5ffd5b61335a8a828b016132c8565b909550935050608088013567ffffffffffffffff811115613379575f5ffd5b6133858a828b016132c8565b989b979a50959850939692959293505050565b5f5f5f5f5f5f608087890312156133ad575f5ffd5b8635955060208701359450604087013567ffffffffffffffff8111156133d1575f5ffd5b6133dd89828a016132c8565b909550935050606087013567ffffffffffffffff8111156133fc575f5ffd5b6131b489828a016132c8565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602160045260245ffd5b6005811061344557613445613408565b9052565b6006811061344557613445613408565b6fffffffffffffffffffffffffffffffff815116825264ffffffffff602082015116602083015264ffffffffff604082015116604083015260608101516134a36060840182613449565b506080818101519083015260a090810151910152565b5f8151808452602084019350602083015f5b828110156134f4576134de868351613459565b60c09590950194602091909101906001016134cb565b5093949350505050565b602081526001600160a01b0382511660208201526001600160a01b0360208301511660408201525f604083015161354060608401826001600160a01b03169052565b5060608301516001600160a01b038116608084015250608083015164ffffffffff811660a08401525060a083015161357b60c0840182613435565b5060c083015160e083015260e0830151610100808401526135a06101208401826134b9565b949350505050565b5f81518084528060208401602086015e5f6020828601015260207fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011685010191505092915050565b7fff000000000000000000000000000000000000000000000000000000000000008816815260e060208201525f61362e60e08301896135a8565b828103604084015261364081896135a8565b606084018890526001600160a01b038716608085015260a0840186905283810360c0850152845180825260208087019350909101905f5b81811015613695578351835260209384019390920191600101613677565b50909b9a5050505050505050505050565b60c0810161178d8284613459565b5f5f5f5f5f608086880312156136c8575f5ffd5b853594506020860135935060408601359250606086013567ffffffffffffffff8111156136f3575f5ffd5b6136ff888289016132c8565b969995985093965092949392505050565b5f5f5f60608486031215613722575f5ffd5b8335925060208401359150613739604085016132b9565b90509250925092565b6020810161178d8284613435565b6020810161178d8284613449565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b5f6020828403121561379b575f5ffd5b6120f782613092565b5f5f83357fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe18436030181126137d7575f5ffd5b83018035915067ffffffffffffffff8211156137f1575f5ffd5b60200191503681900382131561313d575f5ffd5b8481526fffffffffffffffffffffffffffffffff8416602082015260606040820181905281018290525f8360808301825b85811015613864576001600160a01b0361384f84613092565b16825260209283019290910190600101613836565b50979650505050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82036138cd576138cd613870565b5060010190565b5f602082840312156138e4575f5ffd5b81356fffffffffffffffffffffffffffffffff811681146120f7575f5ffd5b5f60208284031215613913575f5ffd5b6120f782613079565b8082018082111561178d5761178d613870565b5f606082018583526fffffffffffffffffffffffffffffffff85166020840152606060408401528084518083526080850191506020860192505f5b818110156139915783516001600160a01b031683526020938401939092019160010161396a565b5090979650505050505050565b5f64ffffffffff821664ffffffffff81036139bb576139bb613870565b60010192915050565b64ffffffffff8516815283602082015260606040820152816060820152818360808301375f818301608090810191909152601f9092017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe01601019392505050565b828152604060208201525f6135a060408301846135a8565b5f82518060208501845e5f920191825250919050565b5f60208284031215613a63575f5ffd5b5051919050565b600181811c90821680613a7e57607f821691505b602082108103613ab5577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5091905056fea2646970667358221220510d1d64e242015ec0c62b05b29c99868372a50a160f0e829e8d7656c3e22a3064736f6c634300081e0033" as const;

// Test-only token, used by local integration tests.
export const testUsdcAbi = [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalSupply",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferFrom",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Approval",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "spender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Transfer",
    "inputs": [
      {
        "name": "from",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "ERC20InsufficientAllowance",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "allowance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InsufficientBalance",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "balance",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "needed",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidApprover",
    "inputs": [
      {
        "name": "approver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidReceiver",
    "inputs": [
      {
        "name": "receiver",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSender",
    "inputs": [
      {
        "name": "sender",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "type": "error",
    "name": "ERC20InvalidSpender",
    "inputs": [
      {
        "name": "spender",
        "type": "address",
        "internalType": "address"
      }
    ]
  }
] as const;

export const testUsdcBytecode = "0x608060405234801561000f575f5ffd5b506040518060400160405280600981526020016854657374205553444360b81b81525060405180604001604052806005815260200164745553444360d81b815250816003908161005f919061028c565b50600461006c828261028c565b50505061008c336c0c9f2c9cd04674edea4000000061009160201b60201c565b61036b565b6001600160a01b0382166100bf5760405163ec442f0560e01b81525f60048201526024015b60405180910390fd5b6100ca5f83836100ce565b5050565b6001600160a01b0383166100f8578060025f8282546100ed9190610346565b909155506101689050565b6001600160a01b0383165f908152602081905260409020548181101561014a5760405163391434e360e21b81526001600160a01b038516600482015260248101829052604481018390526064016100b6565b6001600160a01b0384165f9081526020819052604090209082900390555b6001600160a01b038216610184576002805482900390556101a2565b6001600160a01b0382165f9081526020819052604090208054820190555b816001600160a01b0316836001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef836040516101e791815260200190565b60405180910390a3505050565b634e487b7160e01b5f52604160045260245ffd5b600181811c9082168061021c57607f821691505b60208210810361023a57634e487b7160e01b5f52602260045260245ffd5b50919050565b601f82111561028757805f5260205f20601f840160051c810160208510156102655750805b601f840160051c820191505b81811015610284575f8155600101610271565b50505b505050565b81516001600160401b038111156102a5576102a56101f4565b6102b9816102b38454610208565b84610240565b6020601f8211600181146102eb575f83156102d45750848201515b5f19600385901b1c1916600184901b178455610284565b5f84815260208120601f198516915b8281101561031a57878501518255602094850194600190920191016102fa565b508482101561033757868401515f19600387901b60f8161c191681555b50505050600190811b01905550565b8082018082111561036557634e487b7160e01b5f52601160045260245ffd5b92915050565b6108fc806103785f395ff3fe608060405234801561000f575f5ffd5b506004361061009f575f3560e01c8063313ce5671161007257806395d89b411161005857806395d89b411461014d578063a9059cbb14610155578063dd62ed3e14610168575f5ffd5b8063313ce5671461010957806370a0823114610118575f5ffd5b806306fdde03146100a3578063095ea7b3146100c157806318160ddd146100e457806323b872dd146100f6575b5f5ffd5b6100ab6101ad565b6040516100b8919061070f565b60405180910390f35b6100d46100cf36600461078a565b61023d565b60405190151581526020016100b8565b6002545b6040519081526020016100b8565b6100d46101043660046107b2565b610256565b604051600681526020016100b8565b6100e86101263660046107ec565b73ffffffffffffffffffffffffffffffffffffffff165f9081526020819052604090205490565b6100ab610279565b6100d461016336600461078a565b610288565b6100e861017636600461080c565b73ffffffffffffffffffffffffffffffffffffffff9182165f90815260016020908152604080832093909416825291909152205490565b6060600380546101bc9061083d565b80601f01602080910402602001604051908101604052809291908181526020018280546101e89061083d565b80156102335780601f1061020a57610100808354040283529160200191610233565b820191905f5260205f20905b81548152906001019060200180831161021657829003601f168201915b5050505050905090565b5f3361024a818585610295565b60019150505b92915050565b5f336102638582856102a7565b61026e85858561037a565b506001949350505050565b6060600480546101bc9061083d565b5f3361024a81858561037a565b6102a28383836001610423565b505050565b73ffffffffffffffffffffffffffffffffffffffff8381165f908152600160209081526040808320938616835292905220547fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8110156103745781811015610366576040517ffb8f41b200000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff8416600482015260248101829052604481018390526064015b60405180910390fd5b61037484848484035f610423565b50505050565b73ffffffffffffffffffffffffffffffffffffffff83166103c9576040517f96c6fd1e0000000000000000000000000000000000000000000000000000000081525f600482015260240161035d565b73ffffffffffffffffffffffffffffffffffffffff8216610418576040517fec442f050000000000000000000000000000000000000000000000000000000081525f600482015260240161035d565b6102a2838383610568565b73ffffffffffffffffffffffffffffffffffffffff8416610472576040517fe602df050000000000000000000000000000000000000000000000000000000081525f600482015260240161035d565b73ffffffffffffffffffffffffffffffffffffffff83166104c1576040517f94280d620000000000000000000000000000000000000000000000000000000081525f600482015260240161035d565b73ffffffffffffffffffffffffffffffffffffffff8085165f9081526001602090815260408083209387168352929052208290558015610374578273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff167f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9258460405161055a91815260200190565b60405180910390a350505050565b73ffffffffffffffffffffffffffffffffffffffff831661059f578060025f828254610594919061088e565b9091555061064f9050565b73ffffffffffffffffffffffffffffffffffffffff83165f9081526020819052604090205481811015610624576040517fe450d38c00000000000000000000000000000000000000000000000000000000815273ffffffffffffffffffffffffffffffffffffffff85166004820152602481018290526044810183905260640161035d565b73ffffffffffffffffffffffffffffffffffffffff84165f9081526020819052604090209082900390555b73ffffffffffffffffffffffffffffffffffffffff8216610678576002805482900390556106a3565b73ffffffffffffffffffffffffffffffffffffffff82165f9081526020819052604090208054820190555b8173ffffffffffffffffffffffffffffffffffffffff168373ffffffffffffffffffffffffffffffffffffffff167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8360405161070291815260200190565b60405180910390a3505050565b602081525f82518060208401528060208501604085015e5f6040828501015260407fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f83011684010191505092915050565b803573ffffffffffffffffffffffffffffffffffffffff81168114610785575f5ffd5b919050565b5f5f6040838503121561079b575f5ffd5b6107a483610762565b946020939093013593505050565b5f5f5f606084860312156107c4575f5ffd5b6107cd84610762565b92506107db60208501610762565b929592945050506040919091013590565b5f602082840312156107fc575f5ffd5b61080582610762565b9392505050565b5f5f6040838503121561081d575f5ffd5b61082683610762565b915061083460208401610762565b90509250929050565b600181811c9082168061085157607f821691505b602082108103610888577f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b50919050565b80820180821115610250577f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffdfea26469706673582212200b4b3aeca3a7398ed6bd343499146e6f4ca6f87bd34376e59dcbf1b7a7ae532264736f6c634300081e0033" as const;
