class Student:
    #Constructor/initialiser
    def __init__(self, name, age, course):
        self.name = name
        self.age = age
        self.course = course

    #method     
    def display_info(self):
        print(f"Name: {self.name}, Age: {self.age}, Course: {self.course}")

    #Creating an Object (instance)
s1 = Student("Moses", 21, "Computer Science")
s1.display_info()
