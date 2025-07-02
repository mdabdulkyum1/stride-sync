export interface User {
  id: string;
  name: string;
  email: string;
  progress: number;
}

export interface Activity {
  id: string;
  type: 'walk' | 'run' | 'hike';
  distance: number;
  date: Date;
}