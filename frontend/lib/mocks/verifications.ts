import { VerifyResult } from "../types";

export const MOCK_VERIFY_MATCH_TRUE: VerifyResult = {
  report_id: "c3d4e5f6-a7b8-9c0d-1e2f-333333333333",
  match: true,
  recomputed_hash: "0x8fa134d1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7372bc1",
  onchain_hash: "0x8fa134d1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7372bc1",
  status: "validated",
  network: "Arbitrum Sepolia",
  contract_address: "0x3B62e6D109fD5c697204689E41Eb75945C992c6C",
  history: [
    {
      status: "published",
      tx_hash: "0x9ab718e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049a463",
      timestamp: "2026-11-07T12:06:12Z"
    },
    {
      status: "validated",
      tx_hash: "0x12a884e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049fa91",
      timestamp: "2026-11-07T12:30:00Z"
    }
  ],
  note: "The blockchain proves integrity and history of a report, not the truth of its contents."
};

export const MOCK_VERIFY_MATCH_FALSE: VerifyResult = {
  report_id: "a1b2c3d4-e5f6-7a8b-9c0d-111111111111",
  match: false,
  recomputed_hash: "0x4ca820d1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7379999",
  onchain_hash: "0x888888d1b3e8e72c8469d7b425ef8197aa3b72c5a2c4e365022e379ff7371111",
  status: "disputed",
  network: "Arbitrum Sepolia",
  contract_address: "0x3B62e6D109fD5c697204689E41Eb75945C992c6C",
  history: [
    {
      status: "published",
      tx_hash: "0x334418e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e204977aa",
      timestamp: "2026-11-06T09:12:00Z"
    },
    {
      status: "disputed",
      tx_hash: "0x556618e47265911470e4e6c3be31e3d23190204d6e9177b8b4566d8e2049bbcc",
      timestamp: "2026-11-06T14:45:00Z"
    }
  ],
  note: "The blockchain proves integrity and history of a report, not the truth of its contents."
};
