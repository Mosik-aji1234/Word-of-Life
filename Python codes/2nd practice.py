#Parent Class
class Shape:
    def draw(self):
        print("Drawing a generic shape....")


#Subclass 1 -- Overrides draw()
class Circle(Shape):
    def draw(self):
        print("Drawing a Circle: O ")

#Subclass 2 -- Overrides draw()
class Rectangle(Shape):
    def draw(self):
        print("Drawing a Rectangle: []")

#Testing Polymorphism
shapes = [Shape(), Circle(), Rectangle()]

for shape in shapes:
    shape.draw()