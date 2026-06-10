# Base class
class Employee:
    def __init__(self, name, salary):
        self.name = name
        self.salary = salary

    def display_info(self):
        print(f"Name   : {self.name}")
        print(f"Salary : ${self.salary:,.2f}")


# Subclass
class Teacher(Employee):
    def __init__(self, name, salary, subject):
        super().__init__(name, salary)   # calls Employee's __init__
        self.subject = subject

    def display_info(self):
        super().display_info()           # reuses Employee's display
        print(f"Subject: {self.subject}")


# Usage
emp = Employee("Mr. Bello", 50000)
emp.display_info()

print("---")

teacher = Teacher("Mrs. Aisha", 65000, "Mathematics")
teacher.display_info()