import { mediaUrl } from "../../api/client";
import type { User } from "../../types";

export function FriendAvatar({ user }: { user: User }) {
  if (user.avatarUrl) {
    return <img className="friend-avatar" src={mediaUrl(user.avatarUrl)} alt="" />;
  }

  return (
    <span className="friend-avatar friend-avatar--initial" aria-hidden="true">
      {user.username.slice(0, 1).toLowerCase()}
    </span>
  );
}
