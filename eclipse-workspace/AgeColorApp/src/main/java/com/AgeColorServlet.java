package com;

import java.io.IOException;
import java.io.PrintWriter;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/age-color")
public class AgeColorServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {

        resp.setContentType("text/html;charset=UTF-8");
        PrintWriter out = resp.getWriter();

        String firstName = req.getParameter("firstName");
        String lastName = req.getParameter("lastName");
        String ageStr = req.getParameter("age");
        String color = req.getParameter("color");

        out.println("<html><body>");

        // Validate name
        if (firstName == null || firstName.trim().isEmpty() ||
            lastName == null || lastName.trim().isEmpty()) {
            out.println("<p>Please enter your full name.</p>");
        } else {
            int age = Integer.parseInt(ageStr);

            if (age < 18) {
                out.printf("<p>Hello %s %s, you are still a minor.</p>", firstName, lastName);
            } else {
                out.printf("<p>Hello %s %s, you are adult.</p>", firstName, lastName);
            }

            out.printf("<p>Your favorite color is %s.</p>", color);
        }

        out.println("</body></html>");
    }
}
