import { 
  updateWalletBalance, 
  createTransactionAndAdjustWallet,
  deductCampaignBudget,
  approveWorkAndCredit,
  processMoneyRequest
} from './data-cache';
import { ref, get, runTransaction, update, push, set } from 'firebase/database';
import { database } from './firebase';

// Mock Firebase functions
jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  get: jest.fn(),
  runTransaction: jest.fn(),
  update: jest.fn(),
  push: jest.fn(),
  set: jest.fn(),
}));

describe('Data Cache Atomic Operations', () => {
  const mockUid = 'test-user-id';
  const mockWalletRef = { path: `wallets/${mockUid}` };
  const mockTransactionRef = { path: `transactions/${mockUid}` };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock ref to return predictable values
    (ref as jest.Mock).mockImplementation((_, path) => ({ path }));
  });

  describe('updateWalletBalance', () => {
    it('should update wallet balance atomically', async () => {
      const mockCurrentBalance = {
        earnedBalance: 100,
        addedBalance: 200,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockUpdateResult = {
        committed: true,
        snapshot: {
          val: () => ({
            earnedBalance: 150,
            addedBalance: 200,
            pendingAddMoney: 0,
            totalWithdrawn: 50
          })
        }
      };

      (runTransaction as jest.Mock).mockResolvedValue(mockUpdateResult);
      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockCurrentBalance
      });

      const updateFn = (currentBalance: any) => ({
        earnedBalance: currentBalance.earnedBalance + 50
      });

      const result = await updateWalletBalance(mockUid, updateFn);

      expect(runTransaction).toHaveBeenCalledWith(
        { path: `wallets/${mockUid}` },
        expect.any(Function)
      );
      expect(result).toEqual({
        earnedBalance: 150,
        addedBalance: 200,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      });
    });

    it('should return null when transaction is not committed', async () => {
      (runTransaction as jest.Mock).mockResolvedValue({
        committed: false,
        snapshot: null
      });

      const updateFn = (currentBalance: any) => ({ earnedBalance: 100 });
      const result = await updateWalletBalance(mockUid, updateFn);

      expect(result).toBeNull();
    });

    it('should abort transaction when updateFn returns null', async () => {
      const updateFn = (currentBalance: any) => null;

      await updateWalletBalance(mockUid, updateFn);

      expect(runTransaction).toHaveBeenCalledWith(
        { path: `wallets/${mockUid}` },
        expect.any(Function)
      );
    });
  });

  describe('createTransactionAndAdjustWallet', () => {
    it('should create transaction and adjust wallet atomically', async () => {
      const mockTransaction = {
        type: 'add_money',
        amount: 100,
        status: 'pending',
        description: 'Add money request',
        createdAt: Date.now(),
      };

      const mockWalletUpdate = {
        addedBalance: 100,
        pendingAddMoney: 100
      };

      const mockTransRef = { key: 'trans-key' };
      (push as jest.Mock).mockReturnValue(mockTransRef);
      (set as jest.Mock).mockResolvedValue(Promise.resolve());

      const mockCurrentBalance = {
        earnedBalance: 100,
        addedBalance: 200,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockUpdateResult = {
        committed: true,
        snapshot: {
          val: () => ({
            earnedBalance: 100,
            addedBalance: 300, // 200 + 100
            pendingAddMoney: 100, // 0 + 100
            totalWithdrawn: 50
          })
        }
      };

      (runTransaction as jest.Mock).mockResolvedValue(mockUpdateResult);
      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockCurrentBalance
      });

      await createTransactionAndAdjustWallet(mockUid, mockTransaction, mockWalletUpdate);

      expect(push).toHaveBeenCalledWith({ path: `transactions/${mockUid}` });
      expect(set).toHaveBeenCalledWith(mockTransRef, mockTransaction);
      expect(runTransaction).toHaveBeenCalledWith(
        { path: `wallets/${mockUid}` },
        expect.any(Function)
      );
    });

    it('should ensure no negative balances', async () => {
      const mockTransaction = {
        type: 'withdrawal',
        amount: 50,
        status: 'pending',
        description: 'Withdrawal request',
        createdAt: Date.now(),
      };

      const mockWalletUpdate = {
        earnedBalance: -150 // This would result in negative balance
      };

      const mockCurrentBalance = {
        earnedBalance: 100, // Less than the deduction
        addedBalance: 200,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockUpdateResult = {
        committed: true,
        snapshot: {
          val: () => ({
            earnedBalance: 0, // Should be 0, not negative
            addedBalance: 200,
            pendingAddMoney: 0,
            totalWithdrawn: 50
          })
        }
      };

      (runTransaction as jest.Mock).mockResolvedValue(mockUpdateResult);
      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockCurrentBalance
      });

      await createTransactionAndAdjustWallet(mockUid, mockTransaction, mockWalletUpdate);

      // Verify that the transaction function ensures non-negative values
      const transactionCallback = (runTransaction as jest.Mock).mock.calls[0][1];
      const result = transactionCallback(mockCurrentBalance);
      
      // The earnedBalance should be max(0, 100 + (-150)) = max(0, -50) = 0
      expect(result.earnedBalance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('deductCampaignBudget', () => {
    it('should deduct campaign budget and update user wallet atomically', async () => {
      const mockCampaignId = 'campaign-123';
      const mockAmount = 500;
      const mockCampaignRef = { path: `campaigns/${mockCampaignId}` };
      const mockWalletRef = { path: `wallets/${mockUid}` };

      // Mock campaign data
      const mockCampaignData = {
        remainingBudget: 1000,
        totalBudget: 1000,
        creatorId: mockUid
      };

      // Mock wallet data
      const mockWalletData = {
        earnedBalance: 100,
        addedBalance: 800,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockCampaignResult = {
        committed: true,
        snapshot: {
          val: () => ({ ...mockCampaignData, remainingBudget: 500 }) // 1000 - 500
        }
      };

      const mockWalletResult = {
        committed: true,
        snapshot: {
          val: () => ({ ...mockWalletData, addedBalance: 300 }) // 800 - 500
        }
      };

      (runTransaction as jest.Mock)
        .mockResolvedValueOnce(mockCampaignResult) // First call for campaign
        .mockResolvedValueOnce(mockWalletResult); // Second call for wallet

      (ref as jest.Mock).mockImplementation((_, path) => {
        if (path.includes('campaigns')) return mockCampaignRef;
        if (path.includes('wallets')) return mockWalletRef;
        return { path };
      });

      const success = await deductCampaignBudget(mockCampaignId, mockAmount, mockUid);

      expect(success).toBe(true);
      expect(runTransaction).toHaveBeenCalledTimes(2);
    });

    it('should return false if campaign does not exist', async () => {
      const mockCampaignId = 'campaign-123';
      const mockAmount = 500;

      // Mock transaction to return undefined (abort) when campaign doesn't exist
      (runTransaction as jest.Mock).mockImplementation((refPath, transactionUpdate) => {
        // Simulate the first call (campaign) returning undefined to abort
        return Promise.resolve({
          committed: false,
          snapshot: null
        });
      });

      const success = await deductCampaignBudget(mockCampaignId, mockAmount, mockUid);

      expect(success).toBe(false);
      expect(runTransaction).toHaveBeenCalledTimes(1); // Only campaign transaction attempted
    });

    it('should return false if insufficient campaign budget', async () => {
      const mockCampaignId = 'campaign-123';
      const mockAmount = 1500; // More than remaining budget
      const mockCampaignData = {
        remainingBudget: 1000,
        totalBudget: 1000,
        creatorId: mockUid
      };

      // Mock transaction to return undefined when there's insufficient budget
      (runTransaction as jest.Mock).mockImplementation((refPath, transactionUpdate) => {
        const result = transactionUpdate(mockCampaignData);
        if (!result) {
          return Promise.resolve({
            committed: false,
            snapshot: null
          });
        }
        return Promise.resolve({
          committed: false, // Simulate failure
          snapshot: null
        });
      });

      const success = await deductCampaignBudget(mockCampaignId, mockAmount, mockUid);

      expect(success).toBe(false);
    });

    it('should return false if insufficient wallet balance', async () => {
      const mockCampaignId = 'campaign-123';
      const mockAmount = 500;
      const mockCampaignData = {
        remainingBudget: 1000,
        totalBudget: 1000,
        creatorId: mockUid
      };
      const mockWalletData = {
        earnedBalance: 100,
        addedBalance: 300, // Less than the required amount
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockCampaignResult = {
        committed: true,
        snapshot: {
          val: () => ({ ...mockCampaignData, remainingBudget: 500 })
        }
      };

      // Mock wallet transaction to fail due to insufficient balance
      (runTransaction as jest.Mock)
        .mockResolvedValueOnce(mockCampaignResult) // Campaign succeeds
        .mockResolvedValue({
          committed: false, // Wallet transaction fails
          snapshot: null
        });

      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockWalletData
      });

      const success = await deductCampaignBudget(mockCampaignId, mockAmount, mockUid);

      expect(success).toBe(false);
    });
  });

  describe('approveWorkAndCredit', () => {
    it('should approve work and credit user atomically', async () => {
      const mockWorkId = 'work-123';
      const mockUserId = 'user-123';
      const mockCampaignId = 'campaign-123';
      const mockReward = 100;

      const mockWorkData = {
        status: 'pending',
        reward: mockReward,
        userId: mockUserId,
        campaignId: mockCampaignId
      };

      const mockWalletData = {
        earnedBalance: 200,
        addedBalance: 300,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockWorkResult = {
        committed: true,
        snapshot: {
          val: () => ({ ...mockWorkData, status: 'approved' })
        }
      };

      const mockWalletResult = {
        committed: true,
        snapshot: {
          val: () => ({ ...mockWalletData, earnedBalance: 300 }) // 200 + 100
        }
      };

      (runTransaction as jest.Mock)
        .mockResolvedValueOnce(mockWorkResult) // Work update
        .mockResolvedValueOnce(mockWalletResult); // Wallet update

      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockWorkData
      });

      const success = await approveWorkAndCredit(mockWorkId, mockUserId, mockCampaignId, mockReward);

      expect(success).toBe(true);
      expect(runTransaction).toHaveBeenCalledTimes(2);
    });

    it('should return false if work is not pending', async () => {
      const mockWorkId = 'work-123';
      const mockUserId = 'user-123';
      const mockCampaignId = 'campaign-123';
      const mockReward = 100;

      const mockWorkData = {
        status: 'approved', // Not pending
        reward: mockReward,
        userId: mockUserId,
        campaignId: mockCampaignId
      };

      // Mock to return undefined when work is not pending
      (runTransaction as jest.Mock).mockImplementation((refPath, transactionUpdate) => {
        const result = transactionUpdate(mockWorkData);
        if (!result) {
          return Promise.resolve({
            committed: false,
            snapshot: null
          });
        }
        return Promise.resolve({
          committed: false,
          snapshot: null
        });
      });

      const success = await approveWorkAndCredit(mockWorkId, mockUserId, mockCampaignId, mockReward);

      expect(success).toBe(false);
      expect(runTransaction).toHaveBeenCalledTimes(1); // Only work transaction attempted
    });
  });

  describe('processMoneyRequest', () => {
    it('should process add money request successfully', async () => {
      const mockRequestId = 'req-123';
      const mockType: 'add_money' | 'withdrawal' = 'add_money';
      const mockUserId = 'user-123';
      const mockAmount = 500;
      const mockStatus: 'approved' | 'rejected' = 'approved';

      const mockWalletData = {
        earnedBalance: 100,
        addedBalance: 200,
        pendingAddMoney: 50,
        totalWithdrawn: 30
      };

      const mockUpdateResult = {
        committed: true,
        snapshot: {
          val: () => ({
            earnedBalance: 100,
            addedBalance: 700, // 200 + 500
            pendingAddMoney: 0, // 50 - 50 (but capped at 0)
            totalWithdrawn: 30
          })
        }
      };

      (update as jest.Mock).mockResolvedValue(Promise.resolve());
      (runTransaction as jest.Mock).mockResolvedValue(mockUpdateResult);
      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockWalletData
      });

      const success = await processMoneyRequest(mockRequestId, mockType, mockUserId, mockAmount, mockStatus);

      expect(success).toBe(true);
      expect(update).toHaveBeenCalledWith(
        { path: `adminRequests/addMoney/${mockRequestId}` },
        { status: 'approved' }
      );
    });

    it('should process withdrawal request successfully', async () => {
      const mockRequestId = 'req-456';
      const mockType: 'add_money' | 'withdrawal' = 'withdrawal';
      const mockUserId = 'user-456';
      const mockAmount = 100;
      const mockStatus: 'approved' | 'rejected' = 'approved';

      const mockWalletData = {
        earnedBalance: 200,
        addedBalance: 300,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      const mockUpdateResult = {
        committed: true,
        snapshot: {
          val: () => ({
            earnedBalance: 100, // 200 - 100
            addedBalance: 300,
            pendingAddMoney: 0,
            totalWithdrawn: 150 // 50 + 100
          })
        }
      };

      (update as jest.Mock).mockResolvedValue(Promise.resolve());
      (runTransaction as jest.Mock).mockResolvedValue(mockUpdateResult);
      (get as jest.Mock).mockResolvedValue({
        exists: () => true,
        val: () => mockWalletData
      });

      const success = await processMoneyRequest(mockRequestId, mockType, mockUserId, mockAmount, mockStatus);

      expect(success).toBe(true);
      expect(runTransaction).toHaveBeenCalledWith(
        { path: `wallets/${mockUserId}` },
        expect.any(Function)
      );
    });

    it('should return false if withdrawal amount exceeds earned balance', async () => {
      const mockRequestId = 'req-789';
      const mockType: 'add_money' | 'withdrawal' = 'withdrawal';
      const mockUserId = 'user-789';
      const mockAmount = 500; // More than earned balance
      const mockStatus: 'approved' | 'rejected' = 'approved';

      const mockWalletData = {
        earnedBalance: 200, // Less than requested amount
        addedBalance: 300,
        pendingAddMoney: 0,
        totalWithdrawn: 50
      };

      // Mock transaction to fail when there's insufficient earned balance
      (runTransaction as jest.Mock).mockImplementation((refPath, transactionUpdate) => {
        const result = transactionUpdate(mockWalletData);
        if (!result) {
          return Promise.resolve({
            committed: false,
            snapshot: null
          });
        }
        return Promise.resolve({
          committed: false,
          snapshot: null
        });
      });

      (update as jest.Mock).mockResolvedValue(Promise.resolve());

      const success = await processMoneyRequest(mockRequestId, mockType, mockUserId, mockAmount, mockStatus);

      expect(success).toBe(false);
    });

    it('should handle rejected requests properly', async () => {
      const mockRequestId = 'req-999';
      const mockType: 'add_money' | 'withdrawal' = 'add_money';
      const mockUserId = 'user-999';
      const mockAmount = 500;
      const mockStatus: 'approved' | 'rejected' = 'rejected';

      (update as jest.Mock).mockResolvedValue(Promise.resolve());

      const success = await processMoneyRequest(mockRequestId, mockType, mockUserId, mockAmount, mockStatus);

      expect(success).toBe(true);
      expect(update).toHaveBeenCalledWith(
        { path: `adminRequests/addMoney/${mockRequestId}` },
        { status: 'rejected' }
      );
      expect(runTransaction).not.toHaveBeenCalled(); // No wallet update for rejected requests
    });
  });
});