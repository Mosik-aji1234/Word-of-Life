#Parent class
class Vehicle:
    def __init__(self, brand, speed):
        self.brand = brand
        self.speed = speed
        print("Vehicle __init__ called")

    def describe(self):
        print(f"Brand: {self.brand}, Max Speed: {self.speed} Km/hr")

#Child class
class Car(Vehicle):
    def __init__(self, brand, speed, num_doors):
        super().__init__(brand, speed)  #Calls Parent constructor
        self.num_doors = num_doors
        print("Car __init__ called")

    def describe(self):
        super().describe()              #Call Parent describe() first
        print(f"Doors: {self.num_doors}")

#Creating a Car object
my_car = Car("Toyota", 180, 4)
my_car.describe()