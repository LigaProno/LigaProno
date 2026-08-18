export const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL?.trim() || "https://www.instagram.com/liga.prono/";

export type ContestPartner = {
  name: string;
  instagramUrl: string;
};

/** Parteneri Instagram de urmărit pentru eligibilitate la premiile turneelor publice. */
export const CONTEST_PARTNERS: ContestPartner[] = [
  {
    name: "Kitman",
    instagramUrl:
      process.env.NEXT_PUBLIC_KITMAN_INSTAGRAM_URL?.trim() ||
      "https://www.instagram.com/kitman.ro/",
  },
];
