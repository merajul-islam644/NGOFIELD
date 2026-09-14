import type { User } from "@/types";

export const DEMO_USERS: User[] = [
  {
    id: "off-rahim",
    name: "Rahim Ahmed",
    email: "rahim.ahmed@ngofield.org",
    role: "field_officer",
    district: "Kurigram",
    programmes: ["Education", "Livelihood"],
    assignedAreas: ["Chilmari", "Rowmari", "Rajibpur"],
  },
  {
    id: "user-co-sumaiya",
    name: "Sumaiya Rashid",
    email: "sumaiya.rashid@ngofield.org",
    role: "programme_coordinator",
    district: "Kurigram",
    programmes: ["Education", "Livelihood", "Health"],
    assignedAreas: ["Kurigram", "Gaibandha"],
  },
  {
    id: "user-rm-kabir",
    name: "Kabir Hossain",
    email: "kabir.hossain@ngofield.org",
    role: "regional_manager",
    district: undefined,
    programmes: ["Education", "Livelihood", "Health"],
    assignedAreas: ["Kurigram", "Gaibandha", "Jamalpur", "Cox's Bazar"],
  },
];
