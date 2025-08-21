'use client';

import React, { useState, useCallback } from 'react';
import { verifyTypedData } from 'viem';
import type { Address, Hex } from 'viem';

interface TypedDataField {
  name: string;
  type: string;
}

interface TypedDataDomain {
  name?: string;
  version?: string;
  chainId?: number;
  verifyingContract?: Address;
  salt?: Hex;
}

interface TypedDataTypes {
  [key: string]: TypedDataField[];
}

interface TypedData {
  types: TypedDataTypes;
  domain: TypedDataDomain;
  primaryType: string;
  message: Record<string, any>;
}

interface VerificationResult {
  isValid: boolean;
  error?: string;
  timestamp: string;
}

interface ViemVerifyComponentProps {
  className?: string;
  onVerificationComplete?: (result: VerificationResult) => void;
  defaultAddress?: Address;
  defaultSignature?: Hex;
  defaultTypedData?: TypedData;
}

const ViemVerifyComponent: React.FC<ViemVerifyComponentProps> = ({
  className = '',
  onVerificationComplete,
  defaultAddress = '',
  defaultSignature = '',
  defaultTypedData
}) => {
  const [address, setAddress] = useState<string>(defaultAddress);
  const [signature, setSignature] = useState<string>(defaultSignature);
  const [typedDataJson, setTypedDataJson] = useState<string>(
    defaultTypedData ? JSON.stringify(defaultTypedData, null, 2) : ''
  );
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  const exampleTypedData: TypedData = {
    types: {
      EIP712Domain: [
        { name: 'name', type: 'string' },
        { name: 'version', type: 'string' },
        { name: 'chainId', type: 'uint256' },
        { name: 'verifyingContract', type: 'address' }
      ],
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    },
    domain: {
      name: 'USDC',
      version: '2',
      chainId: 84532,
      verifyingContract: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: '0x7FaB86c4bd4510D657Bec02078AcD77D695758d4',
      to: '0xd7FeB809e8B9C52CE3C0B792506D2FE474aAE06D',
      value: '10000',
      validAfter: '1755628978',
      validBefore: '1755629638',
      nonce: '0x35ac631d461197e823f13d9a0200aa6a5946995efffe3c121fca230f316eff6d'
    }
  };

  const loadExampleData = useCallback(() => {
    setTypedDataJson(JSON.stringify(exampleTypedData, null, 2));
    setAddress('0x7FaB86c4bd4510D657Bec02078AcD77D695758d4');
    setSignature('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b');
  }, []);

  const verifySignature = useCallback(async () => {
    if (!address || !signature || !typedDataJson) {
      const error = 'All fields are required';
      const result: VerificationResult = {
        isValid: false,
        error,
        timestamp: new Date().toISOString()
      };
      setResult(result);
      onVerificationComplete?.(result);
      return;
    }

    setIsVerifying(true);
    setResult(null);

    try {
      // Parse typed data
      const typedData: TypedData = JSON.parse(typedDataJson);

      console.log(typedData);

      // Verify signature using viem
      const isValid = await verifyTypedData({
        address: address as Address,
        ...typedData,
        signature: signature as Hex
      });

      const result: VerificationResult = {
        isValid,
        timestamp: new Date().toISOString()
      };

      console.log('Verification result:', isValid);

      setResult(result);
      onVerificationComplete?.(result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const result: VerificationResult = {
        isValid: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };
      setResult(result);
      onVerificationComplete?.(result);
    } finally {
      setIsVerifying(false);
    }
  }, [address, signature, typedDataJson, onVerificationComplete]);

  const clearForm = useCallback(() => {
    setAddress('');
    setSignature('');
    setTypedDataJson('');
    setResult(null);
  }, []);

  return (
    <div className={`viem-verify-component ${className}`}>
      <style jsx>{`
        .viem-verify-component {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 2rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .subtitle {
          color: #6b7280;
          font-size: 1rem;
        }

        .form-grid {
          display: grid;
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
        }

        .input {
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .textarea {
          min-height: 150px;
          resize: vertical;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.8rem;
        }

        .button-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 2rem;
        }

        .button {
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          font-size: 0.875rem;
        }

        .button-primary {
          background: #3b82f6;
          color: white;
        }

        .button-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .button-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .button-secondary:hover {
          background: #e5e7eb;
        }

        .button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .result {
          padding: 1rem;
          border-radius: 0.5rem;
          font-family: 'Monaco', 'Menlo', monospace;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .result-success {
          background: #dcfce7;
          border: 1px solid #86efac;
          color: #166534;
        }

        .result-error {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          color: #991b1b;
        }

        .result-header {
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-size: 1rem;
        }

        .result-details {
          margin-top: 0.5rem;
          font-size: 0.8rem;
          opacity: 0.8;
        }

        @media (max-width: 640px) {
          .viem-verify-component {
            padding: 1rem;
          }
          
          .button-group {
            flex-direction: column;
          }
          
          .title {
            font-size: 1.5rem;
          }
        }
      `}</style>

      <div className="header">
        <h1 className="title">🔐 TypedData Signature Verification</h1>
        <p className="subtitle">Verify EIP-712 signatures using Viem</p>
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="label" htmlFor="address">
            Signer Address
          </label>
          <input
            id="address"
            type="text"
            className="input"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="signature">
            Signature
          </label>
          <textarea
            id="signature"
            className="input textarea"
            placeholder="0x..."
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            style={{ minHeight: '80px' }}
          />
        </div>

        <div className="form-group">
          <label className="label" htmlFor="typedData">
            Typed Data JSON
            <span style={{ display: 'block', fontWeight: 'normal', color: '#6b7280', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              The exact typed data used to create the signature
            </span>
          </label>
          <textarea
            id="typedData"
            className="input textarea"
            placeholder='{"types": {...}, "domain": {...}, "primaryType": "...", "message": {...}}'
            value={typedDataJson}
            onChange={(e) => setTypedDataJson(e.target.value)}
          />
        </div>
      </div>

      <div className="button-group">
        <button
          className="button button-primary"
          onClick={verifySignature}
          disabled={isVerifying}
        >
          {isVerifying ? (
            <span className="loading">
              <span className="spinner" />
              Verifying...
            </span>
          ) : (
            '🔍 Verify Signature'
          )}
        </button>

        <button
          className="button button-secondary"
          onClick={loadExampleData}
          disabled={isVerifying}
        >
          📝 Load Example
        </button>

        <button
          className="button button-secondary"
          onClick={clearForm}
          disabled={isVerifying}
        >
          🗑️ Clear Form
        </button>
      </div>

      {result && (
        <div className={`result ${result.isValid && !result.error ? 'result-success' : 'result-error'}`}>
          <div className="result-header">
            {result.isValid && !result.error ? '✅ Signature Valid' : '❌ Signature Invalid'}
          </div>
          
          {result.error && (
            <div>
              <strong>Error:</strong> {result.error}
            </div>
          )}
          
          <div className="result-details">
            <div><strong>Address:</strong> {address}</div>
            <div><strong>Valid:</strong> {result.isValid.toString()}</div>
            <div><strong>Timestamp:</strong> {result.timestamp}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViemVerifyComponent;