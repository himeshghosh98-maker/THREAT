import { Cluster } from "../types";

export const MOCK_CLUSTERS: Cluster[] = [
  {
    id: "cluster-fin-phish-01",
    shared_indicator: "198.51.100.42",
    indicator_type: "ip",
    report_ids: [
      "a1b2c3d4-e5f6-7a8b-9c0d-111111111111",
      "c3d4e5f6-a7b8-9c0d-1e2f-333333333333"
    ],
    summary: "Bulletproof host node hosting multiple financial brand phishing landing sites targeting PayPal and Chase customers."
  },
  {
    id: "cluster-redirect-hub-02",
    shared_indicator: "auth-chase-update[.]xyz",
    indicator_type: "redirect_target",
    report_ids: [
      "b2c3d4e5-f6a7-8b9c-0d1e-222222222222",
      "c3d4e5f6-a7b8-9c0d-1e2f-333333333333",
      "7a8b9c0d-1e2f-3a4b-5c6d-777777777777"
    ],
    summary: "Centralized credential harvester and redirect nexus used across both SMS phishing lures and IDN homograph domain vectors."
  }
];

export const MOCK_CLUSTERS_EMPTY: Cluster[] = [];
