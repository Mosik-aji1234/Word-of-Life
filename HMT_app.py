import streamlit as st  #THESE ARE THE LIBRARIES
import numpy as np 
import pandas as pd 
import plotly.graph_objects as go 
from plotly.subplots import make_subplots


st.set_page_config(page_title="HMT Thermal Solver Pro", layout="wide")

st.title("🌡️ Heat Transfer: Plane Wall Analysis")
st.markdown("---")

materials = {
    "Custom (Manual Input)": 0.0,
    "Copper": 1.11e-4,
    "Aluminum": 9.71e-5,
    "Steel (Mild)": 1.22e-5,
    "Concrete": 7.5e-7,
    "Glass": 3.4e-7, 
    "Wood (Oak)": 1.2e-7
}

# FOR THE USER INTERFACE
st.header("1. Input Parameters")
with st.form("input_form"):
    col_mat, col_input = st.columns([1, 2])
    
    with col_mat:
        selected_material = st.selectbox("Select Wall Material", list(materials.keys()))
        default_alpha = materials[selected_material]
    
    with col_input:
        st.subheader("Physical & Numerical Properties")
        st.subheader("Material Selection")
        col_a, col_b = st.columns(2)
        with col_a:
            L = st.number_input("Thickness (L) [m]", value=0.25, format="%.2f")
            
            alpha_val = default_alpha if selected_material != "Custom (Manual Input)" else 0.52e-6
            alpha = st.number_input("Thermal Diffusivity (α) [m²/s]", value=alpha_val, format="%.2e")
            Fo = st.number_input("Fourier Number (Fo)", value=0.25, step=0.05, max_value=0.5)
        
        with col_b:
            Ti = st.number_input("Initial Wall Temp (°C)", value=100.0)
            Tf_heater = st.number_input("Max Heater Temp (°C)", value=700.0)
            nx = 6  
            t_sec = st.number_input("Final time (hrs)", value = 2.0)

    submit_button = st.form_submit_button(label='🚀 SOLVE PROBLEM')

if submit_button:
    # CALCULATIONS
    dx = L / (nx - 1)

    dt_sec = (Fo * (dx ** 2)) / alpha
    dt_hr = dt_sec / 3600
   # nt = 7
    nt = int ((t_sec / dt_hr) + 2)
    
    T = np.full((nt, nx), Ti)
    T[:, 0] = np.linspace(Ti, Tf_heater, nt) 
    T[:, -1] = Ti                            
    
    
    for p in range(0, nt - 1):
        for n in range(1, nx - 1):
            T[p+1, n] = Fo * (T[p, n-1] + ((1/Fo)- 2)*T[p, n] + T[p, n+1])
            
    time_steps = np.arange(nt) * dt_hr

    # THE DATA TABLE
    st.header("2. Solved Numerical Table")
    st.success(f"Stability Criterion Met. Time Step (Δt) = {dt_hr:.4f} hours")
    
    df = pd.DataFrame(T, columns=[f"Node T{i}" for i in range(nx)])
    df.insert(0, "Time (hr)", time_steps)
    st.dataframe(df.style.format("{:.2f}"), use_container_width=True)
    
    # THE Download Button FOR THE CSV
    csv = df.to_csv(index=False).encode('utf-8')
    st.download_button("📥 Download Results (CSV)", data=csv, file_name='thermal_results.csv', mime='text/csv')

    #  GRAPHS
    st.header("3. Temperature History per Node")
    fig_lines = make_subplots(rows=2, cols=3, subplot_titles=[f"Node T{i}" for i in range(nx)])
    colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b']
    
    for i in range(nx):
        row, col = (1 if i < 3 else 2), (i % 3 + 1)
        fig_lines.add_trace(
            go.Scatter(x=time_steps, y=T[:, i], name=f"T{i}", line=dict(color=colors[i], width=3)),
            row=row, col=col
        )
    fig_lines.update_layout(height=500, template="plotly_dark", showlegend=False)
    st.plotly_chart(fig_lines, use_container_width=True)

    #  VOLUME VISUALS 
    st.header("4. 3D Thermal Distribution")
    col_surf, col_vol = st.columns(2)

    with col_surf:
        st.subheader("Time-Distance Gradient Surface")
        x_dist = np.linspace(0, L, nx)
        fig_surf = go.Figure(data=[go.Surface(z=T, x=x_dist, y=time_steps, colorscale='Viridis')])
        fig_surf.update_layout(scene=dict(xaxis_title='Distance', yaxis_title='Time', zaxis_title='Temp'),
                              template="plotly_dark", height=500)
        st.plotly_chart(fig_surf, use_container_width=True)

    with col_vol:
        st.subheader("Final Physical Wall State (3D)")
        X, Y, Z = np.mgrid[0:L:complex(nx), 0:0.1:2j, 0:0.1:2j]
        values = np.tile(T[-1, :], (2, 2, 1)).T
        
        fig_vol = go.Figure(data=go.Isosurface(
            x=X.flatten(), y=Y.flatten(), z=Z.flatten(),
            value=values.flatten(), isomin=Ti, isomax=Tf_heater,
            colorscale='Hot', caps=dict(x_show=True, y_show=True, z_show=True)
        ))
        fig_vol.update_layout(scene=dict(xaxis_title='Thickness', yaxis_title='H', zaxis_title='W'),
                              template="plotly_dark", height=500)
        st.plotly_chart(fig_vol, use_container_width=True)

    # THE  CONCLUSION ... YOU CAN CHANGE THE CONCLUSION TO OUTPUT WHAT YOU WANT TO DISPLAY DURING THE PRESENTATION 
    # THANKS BOSS 
    st.header("Conclusion")
    avg_final = np.mean(T[-1, :])
    st.write(f"""
    **Analysis Summary:**
    - **Material Selection:** You chose **{selected_material}** with a diffusivity of **{alpha:.2e} m²/s**.
    - **Thermal Lag:** The simulation captures how heat penetrates through the {L}m thickness. 
      Node T5 remained at ambient ({Ti}°C) while Node T1 reached {T[-1, 1]:.2f}°C.
    - **Energy Gain:** The average wall temperature increased to **{avg_final:.2f}°C** over {time_steps[-1]:.2f} hours.
    - **Stability:** The Fourier Number of **{Fo}** ensured the Schmidt Method remained stable.
    """)