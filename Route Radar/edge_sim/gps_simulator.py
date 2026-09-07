import math

class RouteSimulator:
    def __init__(self, start_lat, start_lon, end_lat, end_lon, total_duration_seconds):
        self.start_lat = start_lat
        self.start_lon = start_lon
        self.end_lat = end_lat
        self.end_lon = end_lon
        self.total_duration = total_duration_seconds

    def get_coordinate_for_time(self, current_time_seconds):
        """Interpolates lat/lon based on the percentage of time elapsed."""
        if self.total_duration <= 0 or current_time_seconds >= self.total_duration:
            return self.end_lat, self.end_lon
        
        progress = current_time_seconds / self.total_duration
        
        current_lat = self.start_lat + (self.end_lat - self.start_lat) * progress
        current_lon = self.start_lon + (self.end_lon - self.start_lon) * progress
        
        return current_lat, current_lon
