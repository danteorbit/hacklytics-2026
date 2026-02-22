import math

def get_number_open_spots(A_park: int, A_cavg: int, n_cars: int, width_cavg: int) -> int:
    """
    Returns number of open spots for parking spaces in single image
    Args:
        A_park (int): Area of parking space in pixels
        A_cavg (int): Average area of cars in pixels
        n_cars (int): Number of cars detected in the parking space
        width_cavg (int): Average width of car in pixels
    Returns:
        n_spots: Number of open parking spots
    """
    # set correction factor for area of cars
    correction_factor = 2
    # calculate number open spots
    n_spots = math.floor((A_park - A_cavg * n_cars - 2 * width_cavg * correction_factor) / (A_cavg + width_cavg))
    return n_spots
