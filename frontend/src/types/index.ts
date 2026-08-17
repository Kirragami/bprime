export type Health = {
  status: string;
  database: string;
};

export type Item = {
  id: number;
  title: string;
  createdAt: string;
};

export type User = {
  id: number;
  username: string;
  createdAt: string;
};

export type FriendRequest = {
  id: number;
  user: User;
  createdAt: string;
};

export type FriendGraph = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};
