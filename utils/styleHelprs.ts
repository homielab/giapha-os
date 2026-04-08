export function getAvatarBg(gender: string) {
  if (gender === "male") return "bg-linear-to-br from-sky-400 to-sky-500";
  if (gender === "female") return "bg-linear-to-br from-rose-400 to-rose-500";
  return "bg-linear-to-br from-stone-400 to-stone-500";
}
