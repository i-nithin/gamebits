import Image from "next/image";
import { IARC_LABELS, type IarcRating } from "@/lib/constants";
import { cn } from "@/lib/utils";

const IARC_BADGES: Record<IarcRating, string> = {
  "3": "/iarc/3.png",
  "7": "/iarc/7.png",
  "12": "/iarc/12.png",
  "16": "/iarc/16.png",
  "18": "/iarc/18.png",
};

export function IarcBadge({
  rating,
  className,
}: {
  rating: IarcRating;
  className?: string;
}) {
  return (
    <Image
      src={IARC_BADGES[rating]}
      alt={`IARC ${IARC_LABELS[rating]}`}
      width={65}
      height={79}
      className={cn("h-10 w-auto shrink-0", className)}
    />
  );
}
