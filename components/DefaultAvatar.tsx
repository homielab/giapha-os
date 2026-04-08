import { getAvatarBg } from "@/utils/styleHelprs";
import Image from "next/image";

export const AVATAR_VERSION = "v2";

export default function DefaultAvatar({
  gender,
  size = 64,
}: {
  gender?: string;
  size?: number;
}) {
  if (gender === "male") {
    return (
      <Image
        unoptimized
        src={`/avatar/${AVATAR_VERSION}/male.svg`}
        alt="Male"
        className={`w-full h-full object-cover ${getAvatarBg(gender)}`}
        width={size}
        height={size}
      />
    );
  }

  return (
    <Image
      unoptimized
      src={`/avatar/${AVATAR_VERSION}/female.svg`}
      alt="Female"
      className="w-full h-full object-cover"
      width={size}
      height={size}
    />
  );
}
