import { mediaUrl } from "../../api/client";
import type { User } from "../../types";
import { DefaultAvatar } from "./DefaultAvatar";

export function FriendAvatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return <img className="friend-avatar" src={mediaUrl(user.avatarUrl)} alt="" />;
  }

  return <DefaultAvatar />;
}
